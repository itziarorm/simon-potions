import { useState, useRef, useEffect } from 'react';
import { useSound } from '@mrmartineau/use-sound';
import spriteUrl from "./assets/sounds/sprite.mp3";
import './App.css';

const PADS = [
  { id: "ember", label: "Ember", glyph: "I", color: "#fbbf24", sound: "one" },
  { id: "tide", label: "Tide", glyph: "II", color: "#38bdf8", sound: "two" },
  { id: "thorn", label: "Thorn", glyph: "III", color: "#4ade80", sound: "three" },
  { id: "blood", label: "Blood", glyph: "IV", color: "#fb7185", sound: "four" },
];

const INITIAL_SPEED = 650;
const MINIMUM_SPEED = 260;
const FLASH_RATIO = 0.55;

const randomPad = () => Math.floor(Math.random() * PADS.length);

function App() {
  const [play] = useSound(spriteUrl, {
    interrupt: true,
    sprite: {
      one: [0, 500],
      two: [1000, 500],
      three: [2000, 500],
      four:[3000,500],
      error: [4000, 1000],
    },
  });

  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [activePad, setActivePad] = useState(null);
  const [speedMs, setSpeedMs] = useState(INITIAL_SPEED);
  const [message, setMessage] = useState(
    "Press Start to enter the trial."
  );

  const feedbackTimerRef = useRef(null);
  const round = sequence.length;

  const startGame = () => {
    window.clearTimeout(feedbackTimerRef.current);

    setSequence([randomPad()]);
    setPlayerIndex(0);
    setActivePad(null);
    setSpeedMs(INITIAL_SPEED);
    setMessage("Watch the runes.");
    setPhase("showing");
  };

  const flashPad = (padIndex, duration = 160) => {
    setActivePad(padIndex);
    window.clearTimeout(feedbackTimerRef.current);

    feedbackTimerRef.current = window.setTimeout(() => {
      setActivePad(null);
    }, duration);
  };

  useEffect(()=> {
    return () => window.clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if(phase !== "showing" || sequence.length === 0){
      return undefined;
    }

    const timers = [];
    setMessage("Watch the runes.");

    sequence.forEach((padIndex, index) => {
      const beginsAt = (index + 1) * speedMs;

      timers.push(
        window.setTimeout(() => {
          setActivePad(padIndex);
          play({ id: PADS[padIndex].sound });
        }, beginsAt)
      );

      timers.push(
        window.setTimeout(() => {
          setActivePad(null);
        }, beginsAt + speedMs * FLASH_RATIO)
      );
    });

    const finishAt = (sequence.length + 1) * speedMs;

    timers.push(
      window.setTimeout(() => {
        setActivePad(null);
        setPlayerIndex(0);
        setMessage("Your turn");
        setPhase("player");
      }, finishAt)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    }
  }, [phase, play, sequence, speedMs]);

  const handlePadPress = (padIndex) => {
    if(phase !== "player") {
      return;
    }

    const expectedPad = sequence[playerIndex];

    if (padIndex !== expectedPad) {
      play({ id: "error" });
      flashPad(expectedPad, 420);
      setMessage(`The sequence broke at rune ${playerIndex + 1}.`);
      setPhase("lost");
      return;
    }

    

    play({ id: PADS[padIndex].sound });
    flashPad(padIndex);

    const completedRound = playerIndex === sequence.length - 1;

    if(completedRound) {
      setMessage("The Circle accepts your answer.");
      setPhase("roundWon");
      return;
    }

    setPlayerIndex((currentIndex) => currentIndex + 1);
  };

  useEffect(() => {
    if(phase !== "roundWon"){
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSequence((currentSequence) => [
        ...currentSequence,
        randomPad(),
      ]);
      setSpeedMs((currentSpeed) => 
        Math.max(MINIMUM_SPEED, currentSpeed - 35)
      );
      setPlayerIndex(0);
      setPhase("showing");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <main className="game-shell">
      <section className='game-card' aria-labelledby='game-title'>
        <header className='game-header'>
          <p className='eyebrow'>The resonant trial</p>
          <h1 id='game-title'>Simon of Kaotika</h1>
        </header>

        {phase === "idle" ? (
          <div className="start-panel">
            <p>Watch the runes, remember their order and answer.</p>
            <button className="action-button" onClick={startGame}>
              Start the Trial
            </button>
          </div>
        ) : (
          <>
          <div className="hud">
            <strong>Round {round}</strong>
            <span aria-live='polite'>{message}</span>
          </div>

          <div className="board" aria-label="Simon rune board">
            {PADS.map((pad, index) => (
              <button
                key={pad.id}
                type="button"
                className={`pad pad--${pad.id} ${
                  activePad === index ? "is-active" : ""
                }`}
                style={{ "--pad-color": pad.color}}
                onClick={() => handlePadPress(index)}
                disabled={phase !=="player"}
                aria-label={`${pad.label} rune`}
                >
                  <span aria-hidden="true">{pad.glyph}</span>
              </button>
            ))}
          </div>

          {phase === "lost" && (
            <button className="action-button" onClick={startGame}>
              Try Again
            </button>
          )}
          </>
        )}
      </section>
    </main>
  )
}

export default App
