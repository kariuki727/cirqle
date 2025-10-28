import { useState, useEffect } from 'react';

// Generate random user ID (e.g., Kev204)
const generateUserId = () => {
  const names = ['Kev', 'Ann', 'Sam', 'Joy', 'Ben', 'Liz', 'Tom', 'Eve', 'Dan', 'Zoe'];
  const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${names[Math.floor(Math.random() * names.length)]}${number}`;
};

// Generate random stake (10–500)
const generateStake = () => {
  return Number((Math.random() * 490 + 10).toFixed(2)); // 10.00–500.00
};

// Generate random cashout (300–12000 for Won, 0 for Lost)
const generateCashout = (result) => {
  return result === 'Won' ? Number((Math.random() * 11700 + 300).toFixed(2)) : 0;
};

// Initial 50 users
const initialPlayers = Array.from({ length: 50 }, () => ({
  userId: generateUserId(),
  result: Math.random() > 0.5 ? 'Won' : 'Lost',
  stake: generateStake(),
  cashout: 0, // Updated in generatePlayerData
}));

// Update cashout based on result
initialPlayers.forEach((player) => {
  player.cashout = generateCashout(player.result);
});

// Hook to simulate real-time player data
export const usePlayerData = () => {
  const [players, setPlayers] = useState(initialPlayers);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prevPlayers) => {
        const newPlayer = {
          userId: generateUserId(),
          result: Math.random() > 0.5 ? 'Won' : 'Lost',
          stake: generateStake(),
          cashout: 0,
        };
        newPlayer.cashout = generateCashout(newPlayer.result);
        return [newPlayer, ...prevPlayers.slice(0, 49)]; // Keep 50 players
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup
  }, []);

  return players;
};