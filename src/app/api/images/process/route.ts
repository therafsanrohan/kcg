import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import sharp from 'sharp'

// Set max duration for Vercel functions as image processing is slow
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Verify Admin authentication (security first)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user is an admin
    const { data: adminCheck } = await supabase.from('admin_users').select('id').eq('email', user.email).single()
    const isOwner = user.email === 'knock.rafsan+admin@gmail.com'
    if (!adminCheck && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paintingId, images } = await req.json()

    if (!paintingId || !images || !Array.isArray(images)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const processedImages = []

    for (const image of images) {
      const { id, storageKey, cropData, isPrimary, sortOrder } = image
      
      // 1. Download Master Image from private bucket
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('paintings_master')
        .download(storageKey)

      if (downloadError || !fileData) {
        console.error(`Error downloading ${storageKey}:`, downloadError)
        continue // Skip to next if fails
      }

      const buffer = Buffer.from(await fileData.arrayBuffer())

      // 2. Initialize Sharp Instance & apply crop if coordinates exist
      let sharpInstance = sharp(buffer)
      
      if (cropData && cropData.width && cropData.height) {
        sharpInstance = sharpInstance.extract({
          left: Math.round(cropData.x),
          top: Math.round(cropData.y),
          width: Math.round(cropData.width),
          height: Math.round(cropData.height)
        })
      }

      // 3. Define target sizes
      const SIZES = [
        { suffix: '480w', width: 480 },
        { suffix: '960w', width: 960 },
        { suffix: '1600w', width: 1600 },
        { suffix: '2560w', width: 2560 }
      ]

      const responsiveUrls: Record<string, string> = {}
      const fileExt = isPrimary ? 'avif' : 'webp' // Primary image uses highly compressed AVIF, others use WebP
      const mimeType = isPrimary ? 'image/avif' : 'image/webp'
      
      let thumbnailKey = ''
      const baseFileName = storageKey.split('/').pop()?.split('.')[0] || id

      // Generate sizes in parallel
      const uploadPromises = SIZES.map(async (size) => {
        const optimizedBuffer = await sharpInstance
          .clone()
          .resize({ width: size.width, withoutEnlargement: true })
          .toFormat(fileExt, { quality: 80 })
          .toBuffer()

        const sizeKey = `${paintingId}/${baseFileName}_${size.suffix}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('paintings_optimized')
          .upload(sizeKey, optimizedBuffer, {
            contentType: mimeType,
            upsert: true,
            cacheControl: '31536000'
          })

        if (!uploadError) {
          responsiveUrls[size.width] = sizeKey
        }
      })

      // Generate Thumbnail (240w)
      const thumbPromise = async () => {
        const thumbBuffer = await sharpInstance
          .clone()
          .resize({ width: 240, height: isPrimary ? 300 : undefined, fit: 'cover', withoutEnlargement: true })
          .toFormat('webp', { quality: 75 })
          .toBuffer()
          
        thumbnailKey = `${paintingId}/${baseFileName}_thumb.webp`
        await supabase.storage
          .from('paintings_optimized')
          .upload(thumbnailKey, thumbBuffer, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '31536000'
          })
      }
      
      await Promise.all([...uploadPromises, thumbPromise()])

      processedImages.push({
        id,
        originalKey: storageKey,
        thumbnailKey,
        responsiveUrls,
        isPrimary,
        sortOrder,
        mimeType
      })
    }

    return NextResponse.json({ success: true, processed: processedImages })

  } catch (error: any) {
    console.error('Image Processing API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
