import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'
import { Color, Vector3, type Group } from 'three'

type CrosshairVariant = 'dot' | 'cross'

export type CrosshairProps = {
  /** Visual style for the reticule. */
  variant?: CrosshairVariant
  /** Main color for the reticule. */
  color?: string
  /** World-space distance in front of the camera to place the reticule. */
  distance?: number
  /** Base size of the reticule in world units. */
  size?: number
}

/**
 * Simple reticule rendered within the 3D scene and parented to the camera.
 */
export function Crosshair({
  variant = 'dot',
  color = '#ef4444',
  distance = 0.6,
  size = 0.0015,
}: CrosshairProps): ReactElement {
  const { camera } = useThree()
  const groupRef = useRef<Group | null>(null)
  const forward = useMemo(() => new Vector3(0, 0, -1), [])
  const targetPosition = useMemo(() => new Vector3(), [])
  const materialColor = useMemo(() => new Color(color), [color])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    targetPosition.copy(camera.position).addScaledVector(forward, distance)
    group.position.copy(targetPosition)
    group.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef} renderOrder={10}>
      {variant === 'dot' ? (
        <mesh>
          <circleGeometry args={[size, 16]} />
          <meshBasicMaterial color={materialColor} />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[size * 0.15, size * 2]} />
            <meshBasicMaterial color={materialColor} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[size * 2, size * 0.15]} />
            <meshBasicMaterial color={materialColor} />
          </mesh>
        </group>
      )}
    </group>
  )
}
