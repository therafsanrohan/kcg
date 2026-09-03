import LoginForm from '@/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 shadow-xl shadow-gray-100/80 rounded-3xl border border-gray-100 animate-fade-in">
        <div className="text-center mb-8">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-gray-600 mb-3">
            Secure Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Kazi Canvas Gallery
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Admin Management Console
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
}
