import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Website Monitor
          </h1>
          <p className="text-gray-600">
            Create your monitoring account
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </div>
  );
}