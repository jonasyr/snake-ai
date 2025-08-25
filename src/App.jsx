import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Settings, Info, Zap } from "lucide-react";

/**
 * Modern Snake Game - Hamiltonian Cycle + Safe Shortcuts
 * Completely redesigned UI/UX with premium aesthetics
 */
export default function App() {
  // -------------------- Config --------------------
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(20);
  const [tickMs, setTickMs] = useState(100);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCycle, setShowCycle] = useState(true);
  const [showPlan, setShowPlan] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  
  const cellPx = 24;
  const lateGameLockK = 4;
  const buffer = 2;

  // -------------------- Geometry & Cycle --------------------
  const L = rows * cols;
  const idx = (r, c) => r * cols + c;
  const rcOf = (i) => [Math.floor(i / cols), i % cols];
  
  const cycle = useMemo(() => {
    const order = [];
    for (let r = 0; r < rows; r++) {
      if (r % 2 === 0) {
        for (let c = 0; c < cols; c++) order.push(idx(r, c));
      } else {
        for (let c = cols - 1; c >= 0; c--) order.push(idx(r, c));
      }
    }
    return order;
  }, [rows, cols]);

  const indexOf = useMemo(() => {
    const m = new Array(L);
    for (let i = 0; i < L; i++) m[cycle[i]] = i;
    return m;
  }, [cycle, L]);

  const nextIdx = (i) => (i + 1) % L;
  const dist = (from, to) => (to - from + L) % L;

  // -------------------- Canvas & DPR --------------------
  const canvasRef = useRef(null);
  const dprRef = useRef(1);
  const ctxRef = useRef(null);

  // -------------------- Game State --------------------
  const snakeRef = useRef([]);
  const occRef = useRef(null);
  const appleRef = useRef(0);
  const plannedRef = useRef([]);
  const shortcutEdgeRef = useRef(null);
  const movesRef = useRef(0);
  const lastShortcutRef = useRef(false);
  const scoreRef = useRef(0);

  const [uiStats, setUiStats] = useState({
    moves: 0,
    length: 1,
    free: L - 1,
    distHeadApple: 0,
    distHeadTail: 0,
    shortcut: false,
    score: 0,
    efficiency: 0,
  });

  // -------------------- Game Logic --------------------
  function initGame(r = rows, c = cols) {
    const L2 = r * c;
    const startCell = cycle[0];
    const startIdx = indexOf[startCell];
    snakeRef.current = [startIdx];
    occRef.current = new Uint8Array(L2);
    occRef.current[startIdx] = 1;
    appleRef.current = randomFreeApple(occRef.current, L2);
    plannedRef.current = [];
    shortcutEdgeRef.current = null;
    movesRef.current = 0;
    lastShortcutRef.current = false;
    scoreRef.current = 0;
    setGameOver(false);
    
    updateUIStats(startIdx, startIdx, false, 0);
  }

  function updateUIStats(headIdx, tailIdx, usedShortcut, score) {
    const efficiency = movesRef.current > 0 ? (score / movesRef.current * 100) : 0;
    setUiStats({
      moves: movesRef.current,
      length: snakeRef.current.length,
      free: L - snakeRef.current.length,
      distHeadApple: dist(headIdx, appleRef.current),
      distHeadTail: dist(headIdx, tailIdx),
      shortcut: usedShortcut,
      score,
      efficiency: Math.round(efficiency),
    });
  }

  function randomFreeApple(occ, len) {
    const freeCount = len - occ.reduce((a, b) => a + b, 0);
    let k = Math.floor(Math.random() * freeCount);
    for (let i = 0; i < len; i++) {
      if (!occ[i]) {
        if (k === 0) return i;
        k--;
      }
    }
    return 0;
  }

  const neighborsCellId = (cellId) => {
    const [r, c] = rcOf(cellId);
    const nn = [];
    if (r > 0) nn.push(idx(r - 1, c));
    if (r < rows - 1) nn.push(idx(r + 1, c));
    if (c > 0) nn.push(idx(r, c - 1));
    if (c < cols - 1) nn.push(idx(r, c + 1));
    return nn;
  };

  function stepOnce() {
    if (gameOver) return;
    
    const snake = snakeRef.current;
    const occ = occRef.current;
    const appleIdx = appleRef.current;
    const headIdx = snake[0];
    const headCell = cycle[headIdx];
    const tailIdx = snake[snake.length - 1];
    const nextHeadIdx = nextIdx(headIdx);

    // Check if the game is complete (all cells filled)
    if (snake.length === L) {
      setGameOver(true);
      setRunning(false);
      return;
    }

    const windowSize = Math.max(0, dist(headIdx, tailIdx) - buffer);
    const freeCells = L - snake.length;
    // Allow shortcuts from the beginning, but with more restrictive conditions for early game
    const shortcutsAllowed = snake.length === 1 ? 
      windowSize > 1 : // Early game: simpler condition
      freeCells > lateGameLockK && windowSize > 2; // Late game: stricter conditions

    let bestCandidate = null;
    let bestRefDist = dist(nextHeadIdx, appleIdx);

    const nn = neighborsCellId(headCell);
    for (let k = 0; k < nn.length; k++) {
      const nCell = nn[k];
      const nIdx = indexOf[nCell];
      const forward = dist(headIdx, nIdx);
      const steppingIntoTail = nIdx === tailIdx;
      const nOcc = occ[nIdx] === 1;
      const wouldEat = nIdx === appleIdx;
      const cellFreeOrTailMove = !nOcc || (steppingIntoTail && !wouldEat);
      const inSafeWindow = forward > 0 && forward < windowSize;

      if (shortcutsAllowed && cellFreeOrTailMove && inSafeWindow) {
        const dToApple = dist(nIdx, appleIdx);
        if (dToApple < bestRefDist) {
          bestRefDist = dToApple;
          bestCandidate = { cellId: nCell, cycleIdx: nIdx, forward };
        } else if (dToApple === bestRefDist && bestCandidate && forward < bestCandidate.forward) {
          bestCandidate = { cellId: nCell, cycleIdx: nIdx, forward };
        }
      }
    }

    let targetIdx = nextHeadIdx;
    let targetCell = cycle[targetIdx];
    let usedShortcut = false;

    if (bestCandidate) {
      targetIdx = bestCandidate.cycleIdx;
      targetCell = bestCandidate.cellId;
      usedShortcut = true;
    }

    // Check for collision with self (excluding tail that will move)
    if (occ[targetIdx] === 1 && targetIdx !== tailIdx) {
      setGameOver(true);
      setRunning(false);
      return;
    }

    // Check if the target cell would cause the snake to hit itself when not eating
    if (targetIdx !== appleIdx && occ[targetIdx] === 1 && targetIdx !== tailIdx) {
      setGameOver(true);
      setRunning(false);
      return;
    }

    const plan = [];
    let cur = targetIdx;
    while (cur !== appleIdx && plan.length < L) {
      cur = nextIdx(cur);
      plan.push(cur);
    }
    plannedRef.current = plan;
    shortcutEdgeRef.current = usedShortcut ? [headCell, targetCell] : null;

    if (targetIdx === appleIdx) {
      snake.unshift(targetIdx);
      occ[targetIdx] = 1;
      scoreRef.current += 10 + (usedShortcut ? 5 : 0); // bonus for shortcuts
      appleRef.current = randomFreeApple(occ, L);
    } else {
      const oldTail = snake.pop();
      occ[oldTail] = 0;
      snake.unshift(targetIdx);
      occ[targetIdx] = 1;
    }

    movesRef.current += 1;
    lastShortcutRef.current = usedShortcut;

    const newHead = snake[0];
    const newTail = snake[snake.length - 1];
    updateUIStats(newHead, newTail, usedShortcut, scoreRef.current);
  }

  // -------------------- Enhanced Render --------------------
  function draw() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const DPR = dprRef.current;
    const W = cols * cellPx;
    const H = rows * cellPx;

    ctx.clearRect(0, 0, W * DPR, H * DPR);

    // Dark gradient background
    ctx.save();
    ctx.scale(DPR, DPR);
    
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid with glow
    ctx.strokeStyle = '#1e40af20';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 1;
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = r * cellPx + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * cellPx + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Hamiltonian cycle flow (animated)
    if (showCycle) {
      ctx.save();
      ctx.scale(DPR, DPR);
      const time = performance.now() / 3000;
      ctx.strokeStyle = '#1e40af30';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time);
      ctx.beginPath();
      for (let i = 0; i < L; i++) {
        const fromCell = cycle[i];
        const toCell = cycle[nextIdx(i)];
        const [fr, fc] = rcOf(fromCell);
        const [tr, tc] = rcOf(toCell);
        const x1 = fc * cellPx + cellPx / 2;
        const y1 = fr * cellPx + cellPx / 2;
        const x2 = tc * cellPx + cellPx / 2;
        const y2 = tr * cellPx + cellPx / 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.restore();
    }

    const snake = snakeRef.current;
    const planned = plannedRef.current;
    const appleIdx = appleRef.current;

    // Planned path with animated gradient
    if (showPlan && planned.length) {
      ctx.save();
      ctx.scale(DPR, DPR);
      const time = performance.now() / 2000;
      for (let k = 0; k < planned.length; k++) {
        const cell = cycle[planned[k]];
        const [r, c] = rcOf(cell);
        const alpha = 0.3 + 0.2 * Math.sin(time + k * 0.1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#06b6d4';
        roundRect(ctx, c * cellPx + 2, r * cellPx + 2, cellPx - 4, cellPx - 4, 8);
        ctx.fill();
      }
      ctx.restore();
    }

    // Apple with glow effect
    {
      const cell = cycle[appleIdx];
      const [r, c] = rcOf(cell);
      ctx.save();
      ctx.scale(DPR, DPR);
      const x = c * cellPx + cellPx / 2;
      const y = r * cellPx + cellPx / 2;
      
      // Glow
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, cellPx / 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, cellPx / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Snake with gradient and glow
    ctx.save();
    ctx.scale(DPR, DPR);
    for (let i = snake.length - 1; i >= 0; i--) {
      const cell = cycle[snake[i]];
      const [r, c] = rcOf(cell);
      const x = c * cellPx + cellPx / 2;
      const y = r * cellPx + cellPx / 2;
      const size = i === 0 ? cellPx - 4 : cellPx - 6;
      
      if (i === 0) {
        // Head with intense glow
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#10b981';
        roundRect(ctx, x - size/2, y - size/2, size, size, 10);
        ctx.fill();
        
        // Head highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(x - 3, y - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body with gradient
        const alpha = 0.8 - (i / snake.length) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#059669';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#059669';
        roundRect(ctx, x - size/2, y - size/2, size, size, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Shortcut edge with electric effect
    if (shortcutEdgeRef.current) {
      const [fromCell, toCell] = shortcutEdgeRef.current;
      const [fr, fc] = rcOf(fromCell);
      const [tr, tc] = rcOf(toCell);
      const x1 = (fc + 0.5) * cellPx;
      const y1 = (fr + 0.5) * cellPx;
      const x2 = (tc + 0.5) * cellPx;
      const y2 = (tr + 0.5) * cellPx;
      
      ctx.save();
      ctx.scale(DPR, DPR);
      
      const time = performance.now() / 200;
      const intensity = 0.8 + 0.4 * Math.sin(time);
      
      // Electric glow
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = `rgba(251, 191, 36, ${intensity})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Inner lightning
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // -------------------- Animation Loop --------------------
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const accRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    dprRef.current = DPR;
    const W = cols * cellPx;
    const H = rows * cellPx;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    lastRef.current = performance.now();
    accRef.current = 0;

    const loop = (time) => {
      const dt = time - lastRef.current;
      lastRef.current = time;
      accRef.current += dt;

      while (running && !gameOver && accRef.current >= tickMs) {
        stepOnce();
        accRef.current -= tickMs;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rows, cols, tickMs, running]);

  // -------------------- Effects & Controls --------------------
  useEffect(() => {
    initGame(rows, cols);
  }, [rows, cols]);

  function resetGame() {
    initGame(rows, cols);
  }

  function stepButton() {
    if (gameOver) return;
    setRunning(false);
    stepOnce();
    draw();
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") {
        e.preventDefault();
        setRunning((r) => !r);
      }
      if (e.key.toLowerCase() === "r") resetGame();
      if (e.key === "ArrowRight") stepButton();
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // -------------------- UI Components --------------------
  const StatCard = ({ label, value, icon: Icon, color = "blue", subtitle }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 text-${color}-400`} />
        <span className={`text-2xl font-bold text-${color}-400`}>{value}</span>
      </div>
      <p className="text-sm text-gray-300 font-medium">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );

  const ControlButton = ({ onClick, children, variant = "secondary", active = false }) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200";
    const variants = {
      primary: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105",
      secondary: `${active ? 'bg-white/20' : 'bg-white/10'} text-white border border-white/20 hover:bg-white/20 hover:border-white/30`,
      danger: "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
    };
    
    return (
      <button 
        onClick={onClick} 
        className={`${baseClasses} ${variants[variant]}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Snake AI
              </h1>
              <p className="text-gray-400 mt-1">Hamiltonian Cycle with Smart Shortcuts</p>
            </div>
            <ControlButton onClick={() => setShowSettings(!showSettings)} active={showSettings}>
              <Settings className="w-4 h-4" />
              Settings
            </ControlButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
          {/* Game Area */}
          <div className="flex flex-col items-center">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <ControlButton 
                onClick={() => gameOver ? resetGame() : setRunning(!running)} 
                variant="primary"
              >
                {gameOver ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Game Over - Restart
                  </>
                ) : (
                  <>
                    {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {running ? "Pause" : "Play"}
                  </>
                )}
              </ControlButton>
              
              <ControlButton onClick={stepButton}>
                <SkipForward className="w-4 h-4" />
                Step
              </ControlButton>
              
              <ControlButton onClick={resetGame} variant="danger">
                <RotateCcw className="w-4 h-4" />
                Reset
              </ControlButton>

              <div className="border-l border-white/20 pl-4 ml-4 flex gap-2">
                <ControlButton 
                  onClick={() => setShowCycle(!showCycle)} 
                  active={showCycle}
                  variant="secondary"
                >
                  Cycle
                </ControlButton>
                <ControlButton 
                  onClick={() => setShowPlan(!showPlan)} 
                  active={showPlan}
                  variant="secondary"
                >
                  Path
                </ControlButton>
              </div>

              <div className="flex items-center gap-3 ml-6">
                <label htmlFor="speed-slider" className="text-sm text-gray-300">Speed</label>
                <input
                  id="speed-slider"
                  type="range"
                  min={20}
                  max={200}
                  step={10}
                  value={tickMs}
                  onChange={(e) => setTickMs(parseInt(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className="text-sm text-gray-400 w-12">{tickMs}ms</span>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
                <canvas 
                  ref={canvasRef} 
                  className="block rounded-2xl"
                  style={{
                    imageRendering: 'pixelated',
                  }}
                />
                {gameOver && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-red-400 mb-2">Game Over!</h2>
                      <p className="text-gray-300 mb-4">
                        {snakeRef.current.length === L ? 'Perfect! You filled the entire grid!' : 'Snake collided with itself'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Final Score: {scoreRef.current} | Length: {snakeRef.current.length}/{L}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Space</kbd>
              <span className="text-gray-400">Play/Pause</span>
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">→</kbd>
              <span className="text-gray-400">Step</span>
              <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">R</kbd>
              <span className="text-gray-400">Reset</span>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-6">
            {/* Performance Stats */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard 
                  label="Score" 
                  value={uiStats.score} 
                  icon={Zap} 
                  color="yellow"
                />
                <StatCard 
                  label="Moves" 
                  value={uiStats.moves} 
                  icon={Info} 
                  color="blue"
                />
                <StatCard 
                  label="Length" 
                  value={uiStats.length} 
                  icon={Info} 
                  color="green"
                  subtitle={`${Math.round((uiStats.length / L) * 100)}% filled`}
                />
                <StatCard 
                  label="Efficiency" 
                  value={`${uiStats.efficiency}%`} 
                  icon={Info} 
                  color="purple"
                  subtitle="Score per move"
                />
              </div>
            </div>

            {/* Algorithm Stats */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Algorithm Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Head → Apple</span>
                  <span className="font-mono text-cyan-400">{uiStats.distHeadApple}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Head → Tail</span>
                  <span className="font-mono text-green-400">{uiStats.distHeadTail}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Free Cells</span>
                  <span className="font-mono text-blue-400">{uiStats.free}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Using Shortcut</span>
                  <div className={`w-3 h-3 rounded-full ${uiStats.shortcut ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span className="text-gray-300">Game Status</span>
                  <span className={`font-semibold ${
                    gameOver ? 'text-red-400' : 
                    running ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {gameOver ? 'Game Over' : running ? 'Running' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-4">Game Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="grid-size" className="block text-sm font-medium text-gray-300 mb-2">
                      Grid Size
                    </label>
                    <select
                      id="grid-size"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
                      value={`${rows}x${cols}`}
                      onChange={(e) => {
                        const [r, c] = e.target.value.split("x").map(x => parseInt(x));
                        setRows(r);
                        setCols(c);
                      }}
                    >
                      <option value="16x16">16×16 (Small)</option>
                      <option value="20x20">20×20 (Medium)</option>
                      <option value="24x24">24×24 (Large)</option>
                      <option value="30x20">30×20 (Wide)</option>
                      <option value="20x30">20×30 (Tall)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Visual Guide</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-400 rounded"></div>
                  <span className="text-gray-300">Snake (AI controlled)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300">Apple target</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-cyan-400/40 rounded"></div>
                  <span className="text-gray-300">Planned path</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-yellow-400 rounded"></div>
                  <span className="text-gray-300">Shortcut edge</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-1 bg-blue-400/30 rounded"></div>
                  <span className="text-gray-300">Hamiltonian cycle</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
