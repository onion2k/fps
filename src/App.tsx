import { useState, type ReactElement } from 'react'
import './App.css'
import { PlaygroundScene } from './game/scene/PlaygroundScene.tsx'

/**
 * Root application component that hosts the initial 3D playground scene.
 */
function App(): ReactElement {
  const [invertMouseY, setInvertMouseY] = useState(false)

  return (
    <div className="app">
      <header className="hud">
        <p className="eyebrow">FPS sandbox</p>
        <h1 className="title">React + R3F + Rapier ready to roll</h1>
        <p className="subtitle">
          Walk with WASD, look with the mouse, and make sure physics stay stable around the crate.
        </p>
        <div className="toggle-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={invertMouseY}
              onChange={(event) => setInvertMouseY(event.target.checked)}
            />
            <span>Invert mouse Y axis</span>
          </label>
          <p className="hint">Click the viewport to lock the pointer, then move and look around.</p>
        </div>
      </header>
      <main className="viewport">
        <PlaygroundScene invertMouseY={invertMouseY} />
      </main>
    </div>
  )
}

export default App
