import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

const names = [
  "John Kamau",
  "Grace Atieno",
  "Daniel Kiptoo Cheruiyot",
  "Mary Chebet Cherono",
  "Brian Ochieng",
  "Michael Barasa Wekesa",
  "Esther Otieno",
  "Abdullahi Mohamed",
  "Lucy Wairimu",
  "Samuel Odhiambo",
  "Janet Nekesa",
  "Peter Njuguna",
  "Fatuma Mohamed",
  "Eliud Kiptanui",
  "Alice Wambui",
  "Victor Wanyonyi",
  "Ruth Jepchirchir",
  "Yusuf Ahmed Ali",
  "Violet Nabwire",
  "Ibrahim Juma Hassan",
  "Patrick Onyango",
  "Sarah Wanjiku",
  "Stephen Rotich",
  "Brenda Nyanchama",
  "James Karanja",
  "Catherine Wekesa",
  "David Musyoka",
  "George Ouma",
  "Halima Yusuf",
  "Paul Korir",
  "Joan Lepapa",
  "Anthony Otieno",
  "Martha Njoki",
  "Joseph Githinji",
  "Rose Kemunto",
  "Collins Bett",
  "Aisha Abdullahi",
  "Richard Kiptoo",
  "Faith Wambui Wangari",
  "Kenneth Nyabuto",
  "Sylvia Atieno Akinyi",
  "Alex Rono",
  "Dorcas Moraa",
  "Martin Odinga",
  "Irene Jeptoo",
  "Simon Barasa",
  "Leah Wanjiku Muthoni",
  "Nasra Abdi",
  "Lydia Chepkemoi"
];

const getRandomWithdrawal = () => {
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomAmount = (Math.random() * (5600 - 1800) + 1800).toFixed(2);
  return { name: randomName, amount: `KES ${randomAmount}` };
};

const WithdrawalToast = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    console.log('WithdrawalToast mounted'); // Debug log
    const showToast = () => {
      const withdrawal = getRandomWithdrawal();
      console.log('Showing toast:', withdrawal); // Debug log
      setToast(withdrawal);
      setTimeout(() => {
        console.log('Hiding toast'); // Debug log
        setToast(null);
      }, 3000);
    };

    showToast();
    const interval = setInterval(() => {
      showToast();
    }, Math.random() * (6000 - 4000) + 4000);

    return () => {
      console.log('Cleaning up toast interval'); // Debug log
      clearInterval(interval);
    };
  }, []);

  if (!toast) {
    console.log('Toast not rendered: toast is null'); // Debug log
    return null;
  }

  console.log('Rendering toast:', toast); // Debug log
  return (
    <div
      role="alert"
      aria-live="polite"
      className=" max-w-xs w-full bg-primary text-white p-1 border-l-4 border-orange-500 shadow-lg z-[60] animate-fade-in"
    >
      <p className="text-sm font-roboto flex items-center">
        {toast.name} withdrew {toast.amount}
        <FontAwesomeIcon icon={faCheck} className="ml-2 h-4 w-4" />
        <FontAwesomeIcon icon={faCheck} className=" h-4 w-4" />
      </p>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in;
        }
      `}</style>
    </div>
  );
};

export { names, WithdrawalToast };