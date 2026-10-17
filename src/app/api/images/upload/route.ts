import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import sharp from 'sharp'

// Maximum execution duration (seconds) for image processing
export const maxDuration = 60

// 5 MB upload limit
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

// Magic byte signatures for authorized image formats
function validateMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Authorize Admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 })
    }

    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    const isOwner =
      user.email?.toLowerCase() === 'knock.rafsan@gmail.com' ||
      user.email?.toLowerCase() === 'knock.rafsan+admin@gmail.com' ||
      user.email?.toLowerCase().startsWith('knock.rafsan')

    if (!adminCheck && !isOwner) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges.' }, { status: 403 })
    }

    // 2. Parse Multipart Form Data directly via Next.js Route Handler
    const formData = await req.formData()
    const paintingId = (formData.get('paintingId') as string) || 'temp'
    const isPrimary = formData.get('isPrimary') === 'true'
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '1', 10)
    const cropDataRaw = formData.get('cropData') as string | null

    let cropData: { x: number; y: number; width: number; height: number } | null = null
    if (cropDataRaw) {
      try {
        cropData = JSON.parse(cropDataRaw)
      } catch {
        // Ignore parsing error, proceed uncropped
      }
    }

    const file = formData.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 })
    }

    // 3. Strict Server-Side Size Validation (Max 5 MB)
    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        { error: `File size (${sizeMB} MB) exceeds maximum allowed limit of 5.0 MB.` },
        { status: 400 }
      )
    }

    // 4. Read Raw Buffer and Verify Genuine Image Signatures
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const detectedFormat = validateMagicBytes(buffer)
    if (!detectedFormat) {
      return NextResponse.json(
        { error: 'Invalid file signature: Only authentic JPEG, PNG, or WebP images are permitted.' },
        { status: 400 }
      )
    }

    // 5. Decode Image with Sharp, Auto-Rotate with EXIF, and Inspect Metadata
    let sharpInstance = sharp(buffer, { failOn: 'error' }).rotate()
    const metadata = await sharpInstance.metadata()

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Could not decode image dimensions.' }, { status: 400 })
    }

    // Protect against decompression bomb (e.g. 50,000 x 50,000 px)
    if (metadata.width > 12000 || metadata.height > 12000) {
      return NextResponse.json(
        { error: 'Image dimensions are unreasonably large (exceeds 12,000px).' },
        { status: 400 }
      )
    }

    // 6. Upload Original High-Res Master to paintings_master bucket
    const uniqueBase = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const masterStorageKey = `${paintingId}/${uniqueBase}_master.${detectedFormat}`

    const { error: masterUploadErr } = await supabase.storage
      .from('paintings_master')
      .upload(masterStorageKey, buffer, {
        contentType: file.type || `image/${detectedFormat}`,
        upsert: true,
        cacheControl: '31536000',
      })

    if (masterUploadErr) {
      console.error('Master storage upload error:', masterUploadErr)
      return NextResponse.json({ error: `Storage upload failed: ${masterUploadErr.message}` }, { status: 500 })
    }

    // 7. Apply Crop Coordinates if User Cropped (bounded safely to image dimensions)
    if (cropData && cropData.width > 0 && cropData.height > 0) {
      const left = Math.max(0, Math.min(Math.round(cropData.x), metadata.width - 1))
      const top = Math.max(0, Math.min(Math.round(cropData.y), metadata.height - 1))
      const width = Math.min(Math.round(cropData.width), metadata.width - left)
      const height = Math.min(Math.round(cropData.height), metadata.height - top)

      if (width > 0 && height > 0) {
        sharpInstance = sharpInstance.extract({ left, top, width, height })
      }
    }

    // 8. Generate Responsive High-Quality Variants (Preserving Composition & Aspect Ratio)
    // SIZES: 480w, 960w, 1600w, 2560w
    const SIZES = [
      { suffix: '480w', width: 480 },
      { suffix: '960w', width: 960 },
      { suffix: '1600w', width: 1600 },
      { suffix: '2560w', width: 2560 },
    ]

    const responsiveUrls: Record<string, string> = {}
    const fileExt = isPrimary ? 'avif' : 'webp'
    const mimeType = isPrimary ? 'image/avif' : 'image/webp'

    // Generate delivery variants with sharp (strips unnecessary EXIF while preserving visual clarity)
    const uploadPromises = SIZES.map(async (size) => {
      const optimizedBuffer = await sharpInstance
        .clone()
        .resize({ width: size.width, withoutEnlargement: true })
        .toFormat(fileExt, { quality: 85 })
        .toBuffer()

      const sizeKey = `${paintingId}/${uniqueBase}_${size.suffix}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('paintings_optimized')
        .upload(sizeKey, optimizedBuffer, {
          contentType: mimeType,
          upsert: true,
          cacheControl: '31536000',
        })

      if (!uploadError) {
        responsiveUrls[size.width] = sizeKey
      }
    })

    // Generate Thumbnail (240w)
    const thumbBuffer = await sharpInstance
      .clone()
      .resize({ width: 240, height: isPrimary ? 300 : undefined, fit: 'cover', withoutEnlargement: true })
      .toFormat('webp', { quality: 80 })
      .toBuffer()

    const thumbnailKey = `${paintingId}/${uniqueBase}_thumb.webp`
    await supabase.storage
      .from('paintings_optimized')
      .upload(thumbnailKey, thumbBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      })

    await Promise.all(uploadPromises)

    return NextResponse.json({
      success: true,
      data: {
        storageKey: masterStorageKey,
        thumbnailKey,
        responsiveUrls,
        isPrimary,
        sortOrder,
        mimeType,
        width: metadata.width,
        height: metadata.height,
      },
    })
  } catch (error: any) {
    console.error('Image Upload Pipeline Error:', error)
    return NextResponse.json({ error: error.message || 'Image processing failed.' }, { status: 500 })
  }
}
