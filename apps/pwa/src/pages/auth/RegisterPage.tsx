import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiClientError } from '../../lib/api-client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'OWNER' | 'TECHNICIAN'>('OWNER');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    if (firstName.length < 2) return 'First name must be at least 2 characters.';
    if (lastName.length < 2) return 'Last name must be at least 2 characters.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        phoneNumber: phoneNumber || undefined,
        role,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setError('An account with this email already exists.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred during registration.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <svg className="h-12 w-12 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-tertiary">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-primary-600">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-accent-600 hover:text-accent-700">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-primary-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" title="Registration Failed">
                {error}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Input
                  id="firstName"
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Input
                  id="lastName"
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <Input
                id="email"
                type="email"
                label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={isSubmitting}
                hint="Must be at least 8 characters long."
              />
            </div>

            <div>
              <Input
                id="phoneNumber"
                type="tel"
                label="Phone Number (Optional)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-3">
                Account Type
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${role === 'OWNER' ? 'border-accent-600 bg-accent-50' : 'border-primary-200 hover:bg-primary-50'}`}
                  onClick={() => !isSubmitting && setRole('OWNER')}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="role-owner"
                      name="role"
                      value="OWNER"
                      checked={role === 'OWNER'}
                      onChange={() => setRole('OWNER')}
                      disabled={isSubmitting}
                      className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-primary-300"
                    />
                    <label htmlFor="role-owner" className="ml-3 block text-sm font-medium text-primary-900 cursor-pointer">
                      Equipment Owner
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-primary-500 pl-7">
                    I own or manage AC equipment and want to track maintenance history
                  </p>
                </div>

                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${role === 'TECHNICIAN' ? 'border-accent-600 bg-accent-50' : 'border-primary-200 hover:bg-primary-50'}`}
                  onClick={() => !isSubmitting && setRole('TECHNICIAN')}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="role-technician"
                      name="role"
                      value="TECHNICIAN"
                      checked={role === 'TECHNICIAN'}
                      onChange={() => setRole('TECHNICIAN')}
                      disabled={isSubmitting}
                      className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-primary-300"
                    />
                    <label htmlFor="role-technician" className="ml-3 block text-sm font-medium text-primary-900 cursor-pointer">
                      Service Technician
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-primary-500 pl-7">
                    I perform AC maintenance and want to record service activities
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
