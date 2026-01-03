import {
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactElement,
} from 'react'
import { useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  Box3,
  Raycaster,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
  type Vector2Tuple,
  type Vector3Tuple,
} from 'three'

type SceneryComponentProps = ComponentPropsWithoutRef<'group'>

export type SceneryClusterProps = {
  component: ComponentType<SceneryComponentProps>
  count: number
  radius: number
  center?: Vector2Tuple | Vector3Tuple
  seed?: number
  castShadow?: boolean
  receiveShadow?: boolean
}

const TAU = Math.PI * 2

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Places multiple instances of a scenery component around a center point with deterministic
 * random positions and ground-aligned rotations.
 */
export function SceneryCluster({
  component: SceneryComponent,
  center = [0, 0],
  count,
  radius,
  seed = 1,
  castShadow = true,
  receiveShadow = true,
}: SceneryClusterProps): ReactElement {
  const { scene } = useThree()
  const normalizedCount = Math.max(0, Math.floor(count))
  const clampedRadius = Math.max(0, radius)

  const placements = useMemo(() => {
    if (normalizedCount === 0) {
      return []
    }

    const random = mulberry32(seed)
    const centerX = center[0]
    const centerZ = center.length === 3 ? center[2] : center[1]
    const componentName = SceneryComponent.displayName ?? SceneryComponent.name ?? 'Scenery'
    const groundMeshes: Object3D[] = []
    const raycaster = new Raycaster()
    const origin = new Vector3()
    const direction = new Vector3(0, -1, 0)
    const maxRayHeight = 200

    scene.traverse((object) => {
      if (object.userData?.isGround === true) {
        groundMeshes.push(object)
      }
    })

    return Array.from({ length: normalizedCount }, (_, index) => {
      const angle = random() * TAU
      const distance = Math.sqrt(random()) * clampedRadius
      const yaw = random() * TAU

      const positionX = centerX + Math.cos(angle) * distance
      const positionZ = centerZ + Math.sin(angle) * distance
      let positionY = 0

      if (groundMeshes.length > 0) {
        origin.set(positionX, maxRayHeight, positionZ)
        raycaster.set(origin, direction)
        raycaster.far = maxRayHeight * 2
        const intersections = raycaster.intersectObjects(groundMeshes, true)
        if (intersections.length > 0) {
          positionY = intersections[0].point.y
        }
      }

      const position: Vector3Tuple = [positionX, positionY, positionZ]
      const rotation: Vector3Tuple = [0, yaw, 0]

      return {
        key: `${componentName}-${index}`,
        position,
        rotation,
      }
    })
  }, [SceneryComponent, center, clampedRadius, normalizedCount, scene, seed])

  return (
    <group>
      {placements.map(({ key, position, rotation }) => (
        <SceneryInstance
          key={key}
          component={SceneryComponent}
          position={position}
          rotation={rotation}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  )
}

type SceneryInstanceProps = {
  component: ComponentType<SceneryComponentProps>
  position: Vector3Tuple
  rotation: Vector3Tuple
  castShadow: boolean
  receiveShadow: boolean
}

function SceneryInstance({
  component: SceneryComponent,
  position,
  rotation,
  castShadow,
  receiveShadow,
}: SceneryInstanceProps): ReactElement {
  const [collider, setCollider] = useState<{
    halfExtents: Vector3Tuple
    center: Vector3Tuple
  } | null>(null)

  const handleGroupRef = useCallback(
    (root: Group | null) => {
      if (!root) {
        return
      }

      root.updateWorldMatrix(true, true)
      const bounds = new Box3()
      const inverseRootMatrix = root.matrixWorld.clone().invert()

      root.traverse((child) => {
        if ('isMesh' in child && (child as Mesh).isMesh) {
          const mesh = child as Mesh
          mesh.castShadow = castShadow
          mesh.receiveShadow = receiveShadow
          if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox()
          }
          const geometryBounds = mesh.geometry.boundingBox
          if (!geometryBounds) {
            return
          }
          const worldBounds = geometryBounds.clone().applyMatrix4(mesh.matrixWorld)
          bounds.union(worldBounds.applyMatrix4(inverseRootMatrix))
        }
      })

      if (!bounds.isEmpty()) {
        const size = new Vector3()
        const center = new Vector3()
        bounds.getSize(size)
        bounds.getCenter(center)
        setCollider({
          halfExtents: [size.x / 2, size.y / 2, size.z / 2],
          center: [center.x, center.y, center.z],
        })
      }
    },
    [castShadow, receiveShadow],
  )

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <group ref={handleGroupRef}>
        <SceneryComponent />
      </group>
      {collider ? (
        <CuboidCollider args={collider.halfExtents} position={collider.center} />
      ) : null}
    </RigidBody>
  )
}
