import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const BOARD_SIZE = 20
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
]
const INITIAL_DIRECTION = { x: 1, y: 0 }
const BASE_TICK_MS = 140
const MIN_TICK_MS = 70
const SPEED_BOOST_FACTOR = 0.84
const FRUIT_TYPES = [
  { id: 'normal', label: '普通果实', points: 1, weight: 70, className: 'fruit-normal' },
  { id: 'gold', label: '黄金果实', points: 5, weight: 22, className: 'fruit-gold' },
  {
    id: 'ruby',
    label: '疾速果实',
    points: 10,
    weight: 8,
    className: 'fruit-ruby',
    speedBoost: true,
  },
]

function pickFruitType() {
  const totalWeight = FRUIT_TYPES.reduce((sum, fruitType) => sum + fruitType.weight, 0)
  let roll = Math.random() * totalWeight

  for (const fruitType of FRUIT_TYPES) {
    roll -= fruitType.weight
    if (roll <= 0) {
      return fruitType
    }
  }

  return FRUIT_TYPES[0]
}

function getRandomFood(snake) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`))
  const available = []

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const key = `${x},${y}`
      if (!occupied.has(key)) {
        available.push({ x, y })
      }
    }
  }

  if (available.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * available.length)
  return {
    ...available[randomIndex],
    type: pickFruitType(),
  }
}

function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [direction, setDirection] = useState(INITIAL_DIRECTION)
  const [nextDirection, setNextDirection] = useState(INITIAL_DIRECTION)
  const [food, setFood] = useState(() => getRandomFood(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [tickMs, setTickMs] = useState(BASE_TICK_MS)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isWin, setIsWin] = useState(false)

  const directionRef = useRef(direction)
  const nextDirectionRef = useRef(nextDirection)
  const foodRef = useRef(food)

  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  useEffect(() => {
    nextDirectionRef.current = nextDirection
  }, [nextDirection])

  useEffect(() => {
    foodRef.current = food
  }, [food])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const keyDirectionMap = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      }
      const candidate = keyDirectionMap[event.key]
      if (!candidate || isGameOver) {
        return
      }

      const current = nextDirectionRef.current
      const isReverse = current.x + candidate.x === 0 && current.y + candidate.y === 0
      if (!isReverse) {
        setNextDirection(candidate)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGameOver])

  useEffect(() => {
    if (isGameOver) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setSnake((previousSnake) => {
        const activeDirection = nextDirectionRef.current
        setDirection(activeDirection)

        const currentHead = previousSnake[0]
        const nextHead = {
          x: currentHead.x + activeDirection.x,
          y: currentHead.y + activeDirection.y,
        }

        // 下一步蛇头只要越过棋盘边界，就算撞墙
        const hitWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= BOARD_SIZE ||
          nextHead.y >= BOARD_SIZE

        if (hitWall) {
          setIsGameOver(true)
          return previousSnake
        }

        const currentFood = foodRef.current
        const hasFood = Boolean(currentFood)
        const ateFood =
          hasFood && nextHead.x === currentFood.x && nextHead.y === currentFood.y
        // 没吃到食物时，尾巴会前移，所以排除最后一节再判断是否撞到自己
        const bodyToCheck = ateFood ? previousSnake : previousSnake.slice(0, -1)
        // 下一步蛇头和身体任意一节重合，就算撞到自己
        const hitSelf = bodyToCheck.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y,
        )

        if (hitSelf) {
          setIsGameOver(true)
          return previousSnake
        }

        const nextSnake = [nextHead, ...previousSnake]
        if (!ateFood) {
          nextSnake.pop()
          return nextSnake
        }

        setScore((previousScore) => previousScore + currentFood.type.points)
        if (currentFood.type.speedBoost) {
          setTickMs((previousTick) =>
            Math.max(MIN_TICK_MS, Math.floor(previousTick * SPEED_BOOST_FACTOR)),
          )
        }
        const nextFood = getRandomFood(nextSnake)
        setFood(nextFood)

        if (!nextFood) {
          setIsWin(true)
          setIsGameOver(true)
        }

        return nextSnake
      })
    }, tickMs)

    return () => window.clearInterval(timer)
  }, [isGameOver, tickMs])

  const snakeCells = useMemo(
    () => new Set(snake.map((segment) => `${segment.x},${segment.y}`)),
    [snake],
  )
  const totalCells = BOARD_SIZE * BOARD_SIZE
  const gameStatusText = isGameOver
    ? isWin
      ? '你赢了，蛇已经占满棋盘！'
      : '游戏结束'
    : '方向键 / WASD 控制移动'

  const restartGame = () => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setNextDirection(INITIAL_DIRECTION)
    setFood(getRandomFood(INITIAL_SNAKE))
    setScore(0)
    setTickMs(BASE_TICK_MS)
    setIsGameOver(false)
    setIsWin(false)
  }

  return (
    <main className="game-page">
      <header className="game-header">
        <h1>React 贪吃蛇</h1>
        <div className="score-display" aria-live="polite">
          <span className="score-label">分数</span>
          <span className="score-value">{score}</span>
        </div>
      </header>

      <section className="panel">
        <div className={`status ${isGameOver ? 'danger' : ''}`}>{gameStatusText}</div>
        <div className="speed-badge">速度：{Math.round((BASE_TICK_MS / tickMs) * 100)}%</div>
        <button type="button" className="restart-button" onClick={restartGame}>
          重新开始
        </button>
      </section>

      <section className="fruit-guide">
        {FRUIT_TYPES.map((fruitType) => (
          <div key={fruitType.id} className="fruit-guide-item">
            <span className={`fruit-dot ${fruitType.className}`} />
            <span>{fruitType.label}</span>
            <span>+{fruitType.points} 分</span>
            {fruitType.speedBoost ? <span className="speed-up-tip">提升速度。</span> : null}
          </div>
        ))}
      </section>

      <section
        className={`board ${isGameOver ? 'disabled' : ''}`}
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      >
        {Array.from({ length: totalCells }, (_, index) => {
          const x = index % BOARD_SIZE
          const y = Math.floor(index / BOARD_SIZE)
          const key = `${x},${y}`
          const isSnake = snakeCells.has(key)
          const isFood = food && food.x === x && food.y === y
          const fruitClass = isFood ? food.type.className : ''

          return (
            <div
              key={key}
              className={`cell ${isSnake ? 'snake' : ''} ${isFood ? `food ${fruitClass}` : ''}`}
            />
          )
        })}
      </section>
    </main>
  )
}

export default App
