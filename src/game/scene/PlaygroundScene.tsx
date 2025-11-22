import { Suspense, type ReactElement } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { PlayerController } from '../controls/PlayerController.tsx'

type PlaygroundSceneProps = {
  invertMouseY?: boolean
}

/**
 * Simple placeholder scene to verify React Three Fiber and Rapier are wired up.
 */
export function PlaygroundScene({ invertMouseY = false }: PlaygroundSceneProps): ReactElement {
  return (
    <Canvas shadows camera={{ position: [7, 6, 10], fov: 50 }}>
      <color attach="background" args={['#0b1021']} />
      <fog attach="fog" args={['#0b1021', 16, 32]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.45} />
        <directionalLight
          castShadow
          intensity={1.1}
          position={[8, 12, 6]}
          shadow-mapSize={[1024, 1024]}
        />
        <Physics gravity={[0, -9.81, 0]}>
          <PlayerController invertY={invertMouseY} />
          <FloatingCrate />
          <Ground />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

function FloatingCrate(): ReactElement {
  return (
    <RigidBody
      colliders="cuboid"
      position={[0, 2.5, 0]}
      restitution={0.2}
      friction={1}
      angularDamping={0.5}
    >
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#22d3ee" metalness={0.05} roughness={0.35} />
      </mesh>
    </RigidBody>
  )
}

function Ground(): ReactElement {
  return (
    <RigidBody type="fixed" friction={1.2} restitution={0.05}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 48, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </RigidBody>
  )
}
