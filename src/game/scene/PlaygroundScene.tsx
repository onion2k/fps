import { Suspense, type ComponentType, type ReactElement } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { Stats } from '@react-three/drei'
import { PlayerController } from '../controls/PlayerController.tsx'
import { SceneryCluster } from './SceneryCluster.tsx'

type NatureModelProps = ComponentPropsWithoutRef<'group'>

type NatureModule = {
  Model?: ComponentType<NatureModelProps>
}

const natureModules = import.meta.glob<NatureModule>('../../assets/nature/*', { eager: true })

const NATURE_MODELS = Object.entries(natureModules).reduce(
  (models, [path, module]) => {
    if (typeof module.Model !== 'function') {
      return models
    }

    const fileName = path.split('/').pop() ?? path
    const modelName = fileName.replace(/\.[^/.]+$/, '')
    models[modelName] = module.Model
    return models
  },
  {} as Record<string, ComponentType<NatureModelProps>>,
)

type PlaygroundSceneProps = {
  invertMouseY?: boolean
}

/**
 * Simple placeholder scene to verify React Three Fiber and Rapier are wired up.
 */
export function PlaygroundScene({ invertMouseY = false }: PlaygroundSceneProps): ReactElement {
  const bushModel = NATURE_MODELS['bush']
  const pineModel = NATURE_MODELS['pine']
  const treeModel = NATURE_MODELS['tree']
  const rockModel = NATURE_MODELS['rock-medium']

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
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-camera-near={1}
          shadow-camera-far={80}
        />
        <Physics gravity={[0, -9.81, 0]}>
          <PlayerController invertY={invertMouseY} />
          <FloatingCrate />
          {bushModel ? (
            <SceneryCluster component={bushModel} center={[0, -20]} count={20} radius={5} />
          ) : null}
          {pineModel ? (
            <SceneryCluster component={pineModel} center={[10, -20]} count={20} radius={5} />
          ) : null}
          {treeModel ? (
            <SceneryCluster component={treeModel} center={[-10, -20]} count={20} radius={5} />
          ) : null}
          {rockModel ? (
            <SceneryCluster component={rockModel} center={[5, 0]} count={3} radius={10} />
          ) : null}
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
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} userData={{ isGround: true }}>
        <planeGeometry args={[48, 48, 16, 16]} />
        <meshStandardMaterial color="#c9e7b2" />
      </mesh>
    </RigidBody>
  )
}
