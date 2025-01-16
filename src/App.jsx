import React, { useCallback, useEffect, useState } from "react";
import { Clock, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';

const SOUNDS = {
  flip: new Audio("/flip.mp3"),
  match: new Audio("/match.mp3"),
  win: new Audio("/win.mp3"),
  lose: new Audio("/lose.mp3"),
  bgm: new Audio("/bgm.mp3"),
};

const CARD_SIZES = {
  2: "w-32 h-32",
  3: "w-28 h-28",
  4: "w-24 h-24",
  5: "w-20 h-20",
  6: "w-16 h-16",
  7: "w-14 h-14",
  8: "w-12 h-12",
};

// Fetch the Pokémon data
const fetchPokemonData = async (numCards) => {
  const pokemonIds = Array.from({ length: numCards }, (_, i) => i + 1);
  try {
    const pokemonData = await Promise.all(
      pokemonIds.map(async (id) => {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) throw new Error(`Failed to fetch pokemon ${id}`);
        const data = await res.json();
        return {
          id: data.id,
          name: data.name,
          image: data.sprites.front_default,
        };
      })
    );
    return pokemonData;
  } catch (error) {
    console.error("Error fetching Pokemon:", error);
    return [];
  }
};

const App = () => {
  const [gridSize, setGridSize] = useState(4);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [bgmPlaying, setBgmPlaying] = useState(false);

  const playSound = useCallback((soundType) => {
    const sound = SOUNDS[soundType];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch((e) => console.error("Error playing sound:", e));
    }
  }, []);

  const toggleBGM = useCallback(() => {
    if (bgmPlaying) {
      SOUNDS.bgm.pause();
      SOUNDS.bgm.currentTime = 0;
    } else {
      SOUNDS.bgm.loop = true;
      SOUNDS.bgm.play().catch((e) => console.error("Error playing BGM:", e));
    }
    setBgmPlaying(!bgmPlaying);
  }, [bgmPlaying]);

  const handleGridChange = (e) => {
    if (e.target.value === "") {
      setGridSize("");
      return;
    }
    let size = parseInt(e.target.value);

    // If odd, round down to nearest even number
    if (size % 2 !== 0) {
      size = size - 1;
    }

    if (size >= 2 && size <= 8) {
      setGridSize(size);
    } else {
      alert("Grid size must be an even number between 2 and 8.");
    }
  };

  const initializeGame = async () => {
    setGameOver(false);
    setGameStarted(false);
    setTimeLeft(120);
    const totalCards = gridSize * gridSize;
    const pairCount = Math.floor(totalCards / 2);
    const pokemonData = await fetchPokemonData(pairCount);
    const shuffledCards = [...pokemonData, ...pokemonData]
      .sort(() => Math.random() - 0.5)
      .slice(0, totalCards)
      .map((pokemon, index) => ({
        id: index,
        name: pokemon.name,
        image: pokemon.image,
      }));
    setCards(shuffledCards);
    setFlipped([]);
    setSolved([]);
  };

  const startGame = () => {
    setGameStarted(true);
    toggleBGM();
  };

  const resetGame = () => {
    initializeGame();
    if (bgmPlaying) {
      toggleBGM();
    }
  };

  useEffect(() => {
    initializeGame();
    return () => {
      Object.values(SOUNDS).forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
    };
  }, [gridSize]);

  useEffect(() => {
    let timer;
    if (gameStarted && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameStarted, gameOver, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      setGameOver(true);
      playSound("lose");
      toggleBGM();
    }
  }, [timeLeft, playSound]);

  useEffect(() => {
    if (solved.length > 0 && solved.length === cards.length) {
      setGameOver(true);
      playSound("win");
      toggleBGM();
    }
  }, [solved, cards.length, playSound]);

  const handleClick = (id) => {
    if (!gameStarted || disabled || flipped.includes(id) || solved.includes(id)) return;
    
    playSound('flip');
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setDisabled(true);
      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];
      
      if (firstCard.name === secondCard.name) {
        playSound('match');
        setSolved([...solved, firstCard.id, secondCard.id]);
        setFlipped([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  };

  const isFlipped = (id) => flipped.includes(id) || solved.includes(id);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold uppercase mb-6">Memory Game</h1>
      <div className="mb-6">
        <label htmlFor="gridSize" className="mr-4 font-semibold">
          Grid Size (Max 8):
        </label>
        <input
          type="number"
          id="gridSize"
          min="2"
          max="8"
          value={gridSize}
          onChange={handleGridChange}
          className="border-2 p-3 w-20 rounded-md"
          disabled={gameStarted}
        />
      </div>

     <div className="flex gap-5 p-4">
       {/* start/reset game button */}
       <button
        onClick={gameStarted ? resetGame : startGame}
        className={`flex mb-6 items-center gap-2 px-4 py-2 rounded-md text-white
        ${gameStarted ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {gameStarted ? (
          <><RefreshCw size={20} /> Reset Game</>
        ) : (
          <><Play size={20} /> Start Game</>
        )}
      </button>

      {/* Background music */}
      <button
        onClick={toggleBGM}
        className="flex items-center gap-2 px-8  rounded-md bg-purple-500 hover:bg-purple-600 text-white"
      >
        {bgmPlaying ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

     </div>
      {/* timer display */}
      {gameStarted && (
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} />
          <span className="font-bold">
            Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* game over */}
      {gameOver && (
        <div className="mb-4 w-96 p-4 border rounded-lg bg-white shadow-lg">
          <h3 className="text-lg font-bold">
            {solved.length === cards.length ? '🎉 Congratulations!' : '⏰ Game Over!'}
          </h3>
          <p className="mt-2">
            {solved.length === cards.length
              ? `You won with ${timeLeft} seconds remaining!`
              : "Time's up! Try again?"}
          </p>
        </div>
      )}

      <div
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(60px, 1fr))`,
          opacity: gameStarted ? 1 : 0.5 
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleClick(card.id)}
            className={`${CARD_SIZES[gridSize]} cursor-pointer flex items-center justify-center border rounded-lg transition-all duration-300
            ${isFlipped(card.id) ? "bg-blue-500" : "bg-gray-300 hover:bg-gray-400"}
            ${!gameStarted || gameOver ? "pointer-events-none" : ""}`}
          >
            {isFlipped(card.id) ? (
              <img 
                src={card.image} 
                alt={card.name} 
                className="w-full h-full object-contain p-1" 
              />
            ) : (
              "?"
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;



