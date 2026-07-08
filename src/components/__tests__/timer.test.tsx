import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timer } from '@/components/timer';

// ---------------------------------------------------------------------------
// Mock the focus context — Timer consumes useFocus()
// ---------------------------------------------------------------------------

const mockFocus = {
  elapsedMs: 0,
  isRunning: false,
  isPaused: false,
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resumeTimer: vi.fn(),
  requestStop: vi.fn(),
  pendingStop: null,
  todayTotal: 0,
  dailyGoalMinutes: 240,
  showMilliseconds: true,
  activities: [],
  timerDirection: 'up' as const,
  plannedCategory: 'Study',
  setPlannedCategory: vi.fn(),
  sessionGoalMinutes: 25,
  setSessionGoalMinutes: vi.fn(),
  customCategories: [] as string[],
  addCustomCategory: vi.fn(),
};

vi.mock('@/context/focus-app', () => ({
  useFocus: () => mockFocus,
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    button: ({ children, ...props }: any) => {
      // Filter out framer-motion specific props
      const { whileHover, whileTap, ...htmlProps } = props;
      return <button {...htmlProps}>{children}</button>;
    },
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Timer component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to idle state
    mockFocus.elapsedMs = 0;
    mockFocus.isRunning = false;
    mockFocus.isPaused = false;
    mockFocus.showMilliseconds = true;
    mockFocus.timerDirection = 'up';
    mockFocus.todayTotal = 0;
    mockFocus.activities = [];
    mockFocus.plannedCategory = 'Study';
    mockFocus.sessionGoalMinutes = 25;
    mockFocus.customCategories = [];
  });

  describe('idle state (not running)', () => {
    it('renders the timer display', () => {
      render(<Timer />);
      expect(screen.getByText('Focus Session')).toBeInTheDocument();
    });

    it('shows start button', () => {
      render(<Timer />);
      expect(screen.getByText('Start')).toBeInTheDocument();
    });

    it('displays 00:00:00 when timer is at zero', () => {
      render(<Timer />);
      // The formatted display for 0ms with showMilliseconds=true
      expect(screen.getByText('00:00:00')).toBeInTheDocument();
    });

    it('shows category selection pills', () => {
      render(<Timer />);
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Study')).toBeInTheDocument();
      expect(screen.getByText('Coding')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });

    it('shows custom categories alongside defaults', () => {
      mockFocus.customCategories = ['Music', 'Art'];
      render(<Timer />);
      expect(screen.getByText('Music')).toBeInTheDocument();
      expect(screen.getByText('Art')).toBeInTheDocument();
    });

    it('shows stats section with streak, today total, sessions', () => {
      render(<Timer />);
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Sessions')).toBeInTheDocument();
    });

    it('calls startTimer when Start is clicked', async () => {
      const user = userEvent.setup();
      render(<Timer />);

      await user.click(screen.getByText('Start'));
      expect(mockFocus.startTimer).toHaveBeenCalledOnce();
    });
  });

  describe('running state (not paused)', () => {
    beforeEach(() => {
      mockFocus.isRunning = true;
      mockFocus.isPaused = false;
      mockFocus.elapsedMs = 5 * 60 * 1000; // 5 minutes
    });

    it('shows Pause and Stop buttons in focus mode', () => {
      render(<Timer focusMode />);
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('calls pauseTimer when Pause is clicked', async () => {
      const user = userEvent.setup();
      render(<Timer focusMode />);

      await user.click(screen.getByText('Pause'));
      expect(mockFocus.pauseTimer).toHaveBeenCalledOnce();
    });

    it('calls requestStop when Stop is clicked', async () => {
      const user = userEvent.setup();
      render(<Timer focusMode />);

      await user.click(screen.getByText('Stop'));
      expect(mockFocus.requestStop).toHaveBeenCalledOnce();
    });

    it('displays elapsed time', () => {
      render(<Timer focusMode />);
      // 5 minutes = 05:00:00 (mm:ss:cs)
      expect(screen.getByText('05:00:00')).toBeInTheDocument();
    });
  });

  describe('paused state', () => {
    beforeEach(() => {
      mockFocus.isRunning = true;
      mockFocus.isPaused = true;
      mockFocus.elapsedMs = 10 * 60 * 1000; // 10 minutes
    });

    it('shows Resume and Stop buttons', () => {
      render(<Timer focusMode />);
      expect(screen.getByText('Resume')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('calls resumeTimer when Resume is clicked', async () => {
      const user = userEvent.setup();
      render(<Timer focusMode />);

      await user.click(screen.getByText('Resume'));
      expect(mockFocus.resumeTimer).toHaveBeenCalledOnce();
    });
  });

  describe('countdown mode', () => {
    beforeEach(() => {
      mockFocus.timerDirection = 'down';
      mockFocus.sessionGoalMinutes = 25;
    });

    it('shows session target selection when in countdown mode', () => {
      render(<Timer />);
      expect(screen.getByText('Session Target')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('25m')).toBeInTheDocument();
      expect(screen.getByText('45m')).toBeInTheDocument();
      expect(screen.getByText('90m')).toBeInTheDocument();
    });

    it('displays remaining time (countdown)', () => {
      mockFocus.isRunning = true;
      mockFocus.elapsedMs = 5 * 60 * 1000; // 5 min elapsed from 25 min goal
      render(<Timer focusMode />);
      // Remaining = 25min - 5min = 20min = 20:00:00
      expect(screen.getByText('20:00:00')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('timer display has aria-live for screen readers', () => {
      const { container } = render(<Timer />);
      const timerDisplay = container.querySelector('[aria-live="polite"]');
      expect(timerDisplay).toBeTruthy();
    });

    it('stop button has accessible label', () => {
      mockFocus.isRunning = true;
      render(<Timer focusMode />);
      expect(screen.getByLabelText('Stop and save session')).toBeInTheDocument();
    });
  });
});
