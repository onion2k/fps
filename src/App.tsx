import type { ReactElement } from 'react'
import './App.css'
import { PlaygroundScene } from './game/scene/PlaygroundScene.tsx'

/**
 * Root application component that hosts the initial 3D playground scene.
 */
function App(): ReactElement {
  return (
    <div className="app">
      <header className="hud">
        <p className="eyebrow">FPS sandbox</p>
        <h1 className="title">React + R3F + Rapier ready to roll</h1>
        <p className="subtitle">
          Orbit around the floating crate to confirm rendering, lighting, and physics are hooked up.
        </p>
      </header>
      <main className="viewport">
        <PlaygroundScene />
      </main>
    </div>
  )
}

export default App
