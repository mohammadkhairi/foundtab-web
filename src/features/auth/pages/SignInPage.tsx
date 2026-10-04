import { SignIn } from '@clerk/react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">FoundTab</h1>
        <p className="text-gray-500 mt-1 text-sm">Urus bisnes dapur anda dengan mudah</p>
      </div>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/"
      />
    </div>
  )
}
