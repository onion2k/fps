import { Suspense, useMemo, type ComponentType, type ReactElement } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { Stats } from '@react-three/drei'
import { PlayerController } from '../controls/PlayerController.tsx'
import type { Vector3Tuple } from 'three'

type NatureModelProps = JSX.IntrinsicElements['group']

type NatureModule = {
  Model?: ComponentType<NatureModelProps>
}

const natureModules = import.meta.glob<NatureModule>('../../assets/nature/*', { eager: true })

const NATURE_MODELS: ComponentType<NatureModelProps>[] = Object.values(natureModules)
  .map((module) => module.Model)
  .filter((Model): Model is ComponentType<NatureModelProps> => typeof Model === 'function')

const GRID_COLUMNS = 8
const GRID_SPACING = 4
const GRID_ORIGIN: Vector3Tuple = [0, 0, -8]

type PlaygroundSceneProps = {
  invertMouseY?: boolean
}

/**
 * Simple placeholder scene to verify React Three Fiber and Rapier are wired up.
 */
export function PlaygroundScene({ invertMouseY = false }: PlaygroundSceneProps): ReactElement {
  return (
    <Canvas shadows camera={{ position: [7, 6, 10], fov: 50 }}>
      <Stats />
      <color attach="background" args={['#cfe8ff']} />
      <fog attach="fog" args={['#cfe8ff', 32, 96]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} color="#f8fbff" />
        <hemisphereLight args={['#f0f8ff', '#d6eabf', 0.6]} />
        <directionalLight
          castShadow
          intensity={1.35}
          color="#ffe7c7"
          position={[10, 14, 6]}
          shadow-mapSize={[1024, 1024]}
        />
        <Physics gravity={[0, -9.81, 0]}>
          <PlayerController invertY={invertMouseY} />
          <FloatingCrate />
          <NatureGrid />
          <Ground />
        </Physics>
      </Suspense>
    </Canvas>
  )
}

function NatureGrid(): ReactElement {
  const placements = useMemo(() => {
    const rows = Math.ceil(NATURE_MODELS.length / GRID_COLUMNS)
    const offsetX = -((GRID_COLUMNS - 1) * GRID_SPACING) / 2 + GRID_ORIGIN[0]
    const offsetZ = -((rows - 1) * GRID_SPACING) / 2 + GRID_ORIGIN[2]

    return NATURE_MODELS.map((Model, index) => {
      const column = index % GRID_COLUMNS
      const row = Math.floor(index / GRID_COLUMNS)
      const position: Vector3Tuple = [
        offsetX + column * GRID_SPACING,
        GRID_ORIGIN[1],
        offsetZ + row * GRID_SPACING,
      ]
      return { Model, position, key: `${Model.displayName ?? Model.name ?? 'NatureModel'}-${index}` }
    })
  }, [])

  return (
    <group>
      {placements.map(({ Model, position, key }) => (
        <Model key={key} position={position} />
      ))}
    </group>
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
        <meshStandardMaterial color="#c9e7b2" />
      </mesh>
    </RigidBody>
  )
}
