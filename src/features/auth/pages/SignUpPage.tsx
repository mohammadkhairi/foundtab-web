import { SignUp } from '@clerk/react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">FoundTab</h1>
        <p className="text-gray-500 mt-1 text-sm">Daftar akaun percuma sekarang</p>
      </div>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/"
      />
    </div>
  )
}
