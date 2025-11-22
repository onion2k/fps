import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Euler, Vector3 } from 'three'

type PlayerControllerProps = {
  invertY?: boolean
}

const MOVE_SPEED = 4.5
const LOOK_SENSITIVITY = 0.0035
const CAMERA_HEIGHT = 1.3
const MAX_PITCH = Math.PI / 2 - 0.05

const keyState: Record<'forward' | 'backward' | 'left' | 'right', boolean> = {
  forward: false,
  backward: false,
  left: false,
  right: false,
}

/**
 * Handles first-person movement (WASD) and mouse look with optional Y inversion.
 * Keeps the camera attached to the player's rigid body.
 */
export function PlayerController({ invertY = false }: PlayerControllerProps): ReactElement {
  const bodyRef = useRef<RapierRigidBody | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const { camera, gl } = useThree()

  const yawEuler = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])
  const cameraEuler = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])
  const frontVector = useMemo(() => new Vector3(), [])
  const sideVector = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      switch (event.code) {
        case 'KeyW':
          keyState.forward = true
          break
        case 'KeyS':
          keyState.backward = true
          break
        case 'KeyA':
          keyState.left = true
          break
        case 'KeyD':
          keyState.right = true
          break
        default:
          break
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          keyState.forward = false
          break
        case 'KeyS':
          keyState.backward = false
          break
        case 'KeyA':
          keyState.left = false
          break
        case 'KeyD':
          keyState.right = false
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const canvas = gl.domElement

    const handleClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock()
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current -= event.movementX * LOOK_SENSITIVITY
      const invertFactor = invertY ? LOOK_SENSITIVITY : -LOOK_SENSITIVITY
      pitch.current += event.movementY * invertFactor
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current))
    }

    canvas.addEventListener('click', handleClick)
    document.addEventListener('pointermove', handlePointerMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('pointermove', handlePointerMove)
    }
  }, [gl, invertY])

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    const { x, y, z } = body.translation()
    camera.position.set(x, y + CAMERA_HEIGHT, z)

    cameraEuler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(cameraEuler)

    yawEuler.set(0, yaw.current, 0)
    frontVector.set(0, 0, -1).applyEuler(yawEuler)
    sideVector.set(-1, 0, 0).applyEuler(yawEuler)

    direction.set(0, 0, 0)
    if (keyState.forward) direction.add(frontVector)
    if (keyState.backward) direction.sub(frontVector)
    if (keyState.left) direction.add(sideVector)
    if (keyState.right) direction.sub(sideVector)

    const lengthSq = direction.lengthSq()
    const desiredSpeed = lengthSq > 0 ? MOVE_SPEED : 0
    if (lengthSq > 0) {
      direction.normalize().multiplyScalar(desiredSpeed)
    }

    const currentVelocity = body.linvel()
    body.setLinvel(
      {
        x: direction.x,
        y: currentVelocity.y,
        z: direction.z,
      },
      true,
    )

    // Prevent unwanted spin from collisions.
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  })

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      canSleep={false}
      enabledRotations={[false, false, false]}
      mass={1}
      friction={1}
      position={[0, CAMERA_HEIGHT, 8]}
    >
      <CapsuleCollider args={[0.9, 0.4]} />
      <mesh visible={false}>
        <capsuleGeometry args={[0.4, 0.9, 8, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </RigidBody>
  )
}
