import { useMemo, useRef, type ReactElement } from 'react'
import { Color, type Group } from 'three'

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
  size = 0.025,
}: CrosshairProps): ReactElement {
  const groupRef = useRef<Group | null>(null)
  const materialColor = useMemo(() => new Color(color), [color])
  const renderOrder = 10000

  return (
    <group ref={groupRef} frustumCulled={false} renderOrder={renderOrder}>
      {variant === 'dot' ? (
        <mesh frustumCulled={false} position={[0, 0, -5]} renderOrder={renderOrder}>
          <circleGeometry args={[size, 16]} />
          <meshBasicMaterial
            color={materialColor}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
            transparent
          />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, 0, 0]} frustumCulled={false} renderOrder={renderOrder}>
            <planeGeometry args={[size * 0.15, size * 2]} />
            <meshBasicMaterial
              color={materialColor}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
              transparent
            />
          </mesh>
          <mesh position={[0, 0, 0]} frustumCulled={false} renderOrder={renderOrder}>
            <planeGeometry args={[size * 2, size * 0.15]} />
            <meshBasicMaterial
              color={materialColor}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
              transparent
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
