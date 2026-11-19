import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calculator as CalcIcon, 
  Delete, 
  RotateCcw, 
  Copy, 
  Check, 
  History 
} from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        handleDecimal();
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        const opMap: Record<string, string> = { '+': '+', '-': '-', '*': '×', '/': '÷' };
        handleOperator(opMap[e.key]);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, display, equation]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return digit;
      if (prev.length >= 12) return prev; // limit max digits
      return prev + digit;
    });
  };

  const handleDecimal = () => {
    setDisplay((prev) => {
      if (prev === 'Error') return '0.';
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    const currentNum = parseFloat(display) || 0;
    setEquation(`${currentNum} ${op}`);
    setDisplay('0');
  };

  const handleEquals = () => {
    if (!equation || display === 'Error') return;

    const parts = equation.trim().split(' ');
    if (parts.length < 2) return;

    const first = parseFloat(parts[0]);
    const op = parts[1];
    const second = parseFloat(display);

    let result = 0;
    if (op === '+') result = first + second;
    else if (op === '-') result = first - second;
    else if (op === '×') result = first * second;
    else if (op === '÷') {
      if (second === 0) {
        setDisplay('Error');
        setEquation('');
        return;
      }
      result = first / second;
    }

    // Round clean to max 4 decimal digits if needed
    const cleanResult = Math.round(result * 10000) / 10000;
    const logEntry = `${equation} ${second} = ${cleanResult}`;
    
    setHistory((prev) => [logEntry, ...prev.slice(0, 19)]);
    setEquation('');
    setDisplay(String(cleanResult));
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev === 'Error' || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handlePercentage = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(val / 100));
    }
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(display) || 0;
    setDisplay(String(current + amount));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <CalcIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm">किराना कैलकुलेटर (Calculator)</h3>
              <p className="text-[10px] text-slate-400">दुकान त्वरित हिसाब</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showHistory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="हिसाब हिस्ट्री"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="bg-slate-950 p-4 text-right flex flex-col justify-end min-h-[96px] border-b border-slate-800 relative">
          <div className="text-slate-400 text-xs font-mono h-5 overflow-hidden">
            {equation || '\u00A0'}
          </div>
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={handleCopy}
              className="text-slate-500 hover:text-indigo-400 p-1 rounded transition-colors text-xs flex items-center gap-1"
              title="कॉपी करें"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{copied ? 'कॉपी हुआ' : 'Copy'}</span>
            </button>
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight truncate max-w-[240px]">
              {display}
            </div>
          </div>
        </div>

        {/* History Panel (Expandable) */}
        {showHistory && (
          <div className="bg-slate-100 p-3 max-h-36 overflow-y-auto border-b border-slate-200 text-xs font-mono space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase pb-1 border-b border-slate-200">
              <span>हाल के हिसाब (History)</span>
              <button 
                onClick={() => setHistory([])}
                className="text-rose-600 hover:underline cursor-pointer"
              >
                साफ करें
              </button>
            </div>
            {history.length > 0 ? (
              history.map((h, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    const ans = h.split('=')[1]?.trim();
                    if (ans) setDisplay(ans);
                  }}
                  className="py-1 px-1.5 hover:bg-white rounded cursor-pointer text-slate-700 flex justify-between"
                >
                  <span className="truncate">{h}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-center py-2">कोई पिछला हिसाब नहीं</div>
            )}
          </div>
        )}

        {/* Kirana Cash Quick Add Pills */}
        <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => handleQuickAdd(10)}
            className="py-1 px-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg border border-slate-200 shadow-2xs text-center transition-all cursor-pointer"
          >
            + ₹10
          </button>
          <button
            onClick={() => handleQuickAdd(50)}
            className="py-1 px-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg border border-slate-200 shadow-2xs text-center transition-all cursor-pointer"
          >
            + ₹50
          </button>
          <button
            onClick={() => handleQuickAdd(100)}
            className="py-1 px-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg border border-slate-200 shadow-2xs text-center transition-all cursor-pointer"
          >
            + ₹100
          </button>
          <button
            onClick={() => handleQuickAdd(500)}
            className="py-1 px-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg border border-slate-200 shadow-2xs text-center transition-all cursor-pointer"
          >
            + ₹500
          </button>
        </div>

        {/* Keypad */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-100">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="py-3 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-sm shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-sm shadow-2xs active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="हटाएं"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={handlePercentage}
            className="py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-sm shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            %
          </button>
          <button
            onClick={() => handleOperator('÷')}
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleDigit('7')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            7
          </button>
          <button
            onClick={() => handleDigit('8')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            8
          </button>
          <button
            onClick={() => handleDigit('9')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            9
          </button>
          <button
            onClick={() => handleOperator('×')}
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleDigit('4')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            4
          </button>
          <button
            onClick={() => handleDigit('5')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            5
          </button>
          <button
            onClick={() => handleDigit('6')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            6
          </button>
          <button
            onClick={() => handleOperator('-')}
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            -
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleDigit('1')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            1
          </button>
          <button
            onClick={() => handleDigit('2')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            2
          </button>
          <button
            onClick={() => handleDigit('3')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            3
          </button>
          <button
            onClick={() => handleOperator('+')}
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleDigit('0')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={() => handleDigit('00')}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-sm shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            00
          </button>
          <button
            onClick={handleDecimal}
            className="py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-black text-base shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            .
          </button>
          <button
            onClick={handleEquals}
            className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};