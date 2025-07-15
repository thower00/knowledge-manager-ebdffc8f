import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <ForgotPasswordForm />
        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-brand-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}