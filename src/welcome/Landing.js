import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import logo1 from '../assets/logo1.png';
import logo2 from '../assets/logo2.png';
import surveyEarn from '../assets/landing/surveyearn.png';
import watchEarn from '../assets/landing/watchearn.png';
import referEarn from '../assets/landing/referearn.png';
import mpesaLogo from '../assets/mpesa.png';
import { WithdrawalToast } from '../data/withdrawals';
import InstallButton from '../components/InstallButton'; // Import the new InstallButton component

const logos = [logo, logo1, logo2];

const Landing = () => {
  const navigate = useNavigate();
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogoIndex((prevIndex) => (prevIndex + 1) % logos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-secondary font-roboto">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent text-white text-center py-20 px-4 sm:py-24">
        <img
          src={logos[currentLogoIndex]}
          alt="Earn to M-Pesa Logo"
          className="w-28 h-28 mx-auto mb-6 animate-fade"
        />
        <h1 className="text-4xl font-bold font-roboto leading-tight sm:text-5xl md:text-6xl">
          Welcome to Earn to M-Pesa
        </h1>
        <p className="text-lg mt-4 font-roboto max-w-2xl mx-auto leading-relaxed sm:text-xl">
          Turn Your Smartphone into a <span className="text-highlight font-semibold">Daily Payday</span>. Earn up to <span className="text-highlight font-semibold">KSh 100,000</span> from home with simple tasks!
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
          <button
            className="w-full sm:w-auto bg-highlight text-white px-6 py-4 rounded-full font-roboto text-lg sm:text-xl font-medium shadow-md hover:bg-accent hover:shadow-lg transform hover:scale-105 active:scale-95 transition duration-300"
            onClick={() => navigate('/signup')}
            aria-label="Sign up to start earning with Earn to M-Pesa"
          >
            Get Started
          </button>
          <button
            className="w-full sm:w-auto bg-white text-primary px-6 py-4 rounded-full font-roboto text-lg sm:text-xl font-medium border-2 border-primary shadow-md hover:bg-accent hover:text-white hover:shadow-lg transform hover:scale-105 active:scale-95 transition duration-300"
            onClick={() => navigate('/signin')}
            aria-label="Sign in to your Earn to M-Pesa account"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Withdrawal Toasts */}
      {/* <div className="w-full max-w-md mx-auto relative">
        <WithdrawalToast />
      </div> */}

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50">
        <h2 className="text-3xl font-bold text-primary text-center font-roboto sm:text-4xl">Why Choose Earn to M-Pesa?</h2>
        <div className="grid grid-cols-1 gap-8 mt-10 max-w-5xl mx-auto md:grid-cols-3">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition duration-300">
            <img
              src={surveyEarn}
              alt="Icon for earning extra money in your spare time"
              className="w-20 h-20 mx-auto mb-4"
            />
            <h3 className="text-xl font-bold text-primary font-roboto">Extra Money in Your Spare Time</h3>
            <p className="text-primary font-roboto mt-3 leading-relaxed">
              <FontAwesomeIcon icon={faCheck} className="text-highlight h-5 w-5 mr-2 inline" />
              Take surveys about your favourite products and get rewarded. All you need is your mobile phone and an internet connection.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition duration-300">
            <img
              src={watchEarn}
              alt="Icon for quick and easy survey participation"
              className="w-20 h-20 mx-auto mb-4"
            />
            <h3 className="text-xl font-bold text-primary font-roboto">Quick and Easy</h3>
            <p className="text-primary font-roboto mt-3 leading-relaxed">
              <FontAwesomeIcon icon={faCheck} className="text-highlight h-5 w-5 mr-2 inline" />
              Anyone can turn their opinions into extra income with Earn to M-Pesa surveys. No experience or qualifications needed.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition duration-300">
            <img
              src={referEarn}
              alt="Icon for signing up and earning rewards"
              className="w-20 h-20 mx-auto mb-4"
            />
            <h3 className="text-xl font-bold text-primary font-roboto">Sign Up, Take Surveys, Get Rewarded</h3>
            <p className="text-primary font-roboto mt-3 leading-relaxed">
              <FontAwesomeIcon icon={faCheck} className="text-highlight h-5 w-5 mr-2 inline" />
              Join now in just a couple of minutes and see how easy it is to supplement your income with online surveys.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-accent to-primary text-white text-center py-12 px-4">
        <h2 className="text-3xl font-bold font-roboto sm:text-4xl">Start Earning Today!</h2>
        <p className="text-lg mt-4 font-roboto max-w-xl mx-auto leading-relaxed">
          Join thousands of users earning with M-Pesa withdrawals. Your next payday is just a survey away!
        </p>
        <button
          className="bg-highlight text-white px-10 py-4 mt-8 rounded-full font-roboto text-lg sm:text-xl font-medium shadow-md hover:bg-white hover:text-primary hover:shadow-lg transform hover:scale-105 active:scale-95 transition duration-300"
          onClick={() => navigate('/signup')}
          aria-label="Join now to start earning with Earn to M-Pesa"
        >
          Join Now
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white text-center py-8">
        <img
          src={mpesaLogo}
          alt="M-Pesa Logo"
          className="h-8 mx-auto mb-4"
        />
        <p className="font-roboto text-sm">© {new Date().getFullYear()} Earn to M-Pesa. All rights reserved.</p>
        <div className="mt-4 space-x-4">
          <a href="#" className="text-white hover:text-highlight font-roboto text-sm" aria-label="Visit our Twitter page">Twitter</a>
          <a href="#" className="text-white hover:text-highlight font-roboto text-sm" aria-label="Visit our Facebook page">Facebook</a>
          <a href="#" className="text-white hover:text-highlight font-roboto text-sm" aria-label="Visit our Instagram page">Instagram</a>
        </div>
      </footer>

      {/* Install Button Card */}
      <InstallButton />

      <style jsx>{`
        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade {
          animation: fade 0.5s ease-in;
        }
      `}</style>
    </div>
  );
};

export default Landing;