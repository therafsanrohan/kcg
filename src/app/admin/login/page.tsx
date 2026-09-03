import LoginForm from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 shadow-sm rounded-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Kazi Canvas Gallery
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Admin Portal
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}
