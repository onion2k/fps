import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Euler, Vector3, type Group, type Vector3Tuple } from 'three'
import Rifle from '../../assets/rifle'

type PlayerControllerProps = {
  invertY?: boolean
}

const MOVE_SPEED = 4.5
const LOOK_SENSITIVITY = 0.0035
const CAMERA_HEIGHT = 1.3
const MAX_PITCH = Math.PI / 2 - 0.05
const JUMP_IMPULSE = 4.5
const GUN_POSITION_OFFSET = new Vector3(0.2, -.35, -0.5)
const GUN_MUZZLE_OFFSET = new Vector3(0, 0.13, -0.75)
const GUN_SWAY_INTENSITY = 0.045
const GUN_SWAY_SMOOTHING = 12
const PROJECTILE_SPEED = 30
const PROJECTILE_LIFETIME_MS = 2400
const AUTO_FIRE_ENABLED = true
const AUTO_FIRE_INTERVAL_MS = 250

const keyState: Record<'forward' | 'backward' | 'left' | 'right' | 'jump', boolean> = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
}

type ProjectileInstance = {
  id: number
  origin: Vector3Tuple
  direction: Vector3Tuple
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
  const contactCount = useRef(0)
  const jumpRequested = useRef(false)
  const gunRef = useRef<Group | null>(null)
  const fireIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null)
  const projectileIdRef = useRef(0)
  const [projectiles, setProjectiles] = useState<ProjectileInstance[]>([])

  const yawEuler = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])
  const cameraEuler = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])
  const frontVector = useMemo(() => new Vector3(), [])
  const sideVector = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])
  const gunOffsetWorld = useMemo(() => new Vector3(), [])
  const gunSway = useMemo(() => new Vector3(), [])
  const gunSwayTarget = useMemo(() => new Vector3(), [])
  const muzzleOffsetWorld = useMemo(() => new Vector3(), [])
  const muzzleWorldPosition = useMemo(() => new Vector3(), [])
  const cameraDirection = useMemo(() => new Vector3(), [])

  const stopAutoFire = useCallback(() => {
    if (fireIntervalRef.current !== null) {
      window.clearInterval(fireIntervalRef.current)
      fireIntervalRef.current = null
    }
  }, [])

  const spawnProjectile = useCallback(() => {
    cameraDirection.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize()

    muzzleOffsetWorld.copy(GUN_POSITION_OFFSET).add(gunSway).add(GUN_MUZZLE_OFFSET)
    muzzleOffsetWorld.applyQuaternion(camera.quaternion)
    muzzleWorldPosition.copy(camera.position).add(muzzleOffsetWorld)

    const id = projectileIdRef.current
    projectileIdRef.current += 1
    const origin: Vector3Tuple = [
      muzzleWorldPosition.x,
      muzzleWorldPosition.y,
      muzzleWorldPosition.z,
    ]
    const directionVector: Vector3Tuple = [cameraDirection.x, cameraDirection.y, cameraDirection.z]

    setProjectiles((prev) => [...prev, { id, origin, direction: directionVector }])
  }, [camera, gunSway, muzzleOffsetWorld, muzzleWorldPosition, cameraDirection])

  const handleProjectileExpire = useCallback((id: number) => {
    setProjectiles((prev) => prev.filter((projectile) => projectile.id !== id))
  }, [])

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
        case 'Space':
          keyState.jump = true
          jumpRequested.current = true
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
        case 'Space':
          keyState.jump = false
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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const canvas = gl.domElement
      const pointerLocked = document.pointerLockElement === canvas
      if (event.button !== 0 || (!pointerLocked && event.target !== canvas)) return
      spawnProjectile()
      if (AUTO_FIRE_ENABLED && fireIntervalRef.current === null) {
        fireIntervalRef.current = window.setInterval(spawnProjectile, AUTO_FIRE_INTERVAL_MS)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return
      stopAutoFire()
    }

    const handlePointerLockChange = () => {
      if (!document.pointerLockElement) {
        stopAutoFire()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', stopAutoFire)
    document.addEventListener('pointerleave', stopAutoFire)
    document.addEventListener('pointerlockchange', handlePointerLockChange)

    return () => {
      stopAutoFire()
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', stopAutoFire)
      document.removeEventListener('pointerleave', stopAutoFire)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [gl, spawnProjectile, stopAutoFire])

  useFrame((_, delta) => {
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

    const gun = gunRef.current
    if (gun) {
      gunSwayTarget.set(-currentVelocity.x, 0, -currentVelocity.z).multiplyScalar(GUN_SWAY_INTENSITY)
      const lerpFactor = 1 - Math.exp(-GUN_SWAY_SMOOTHING * delta)
      gunSway.lerp(gunSwayTarget, lerpFactor)
      gunOffsetWorld.copy(GUN_POSITION_OFFSET).add(gunSway).applyQuaternion(camera.quaternion)
      gun.position.copy(camera.position).add(gunOffsetWorld)
      gun.quaternion.copy(camera.quaternion)
    }

    // Prevent unwanted spin from collisions.
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)

    if (jumpRequested.current && contactCount.current > 0 && Math.abs(currentVelocity.y) < 0.2) {
      body.applyImpulse({ x: 0, y: JUMP_IMPULSE, z: 0 }, true)
    }
    jumpRequested.current = false
  })

  return (
    <>
      <group ref={gunRef} frustumCulled={false}>
        <Rifle args={[]} />
      </group>
      <RigidBody
        ref={bodyRef}
        onCollisionEnter={() => {
          contactCount.current += 1
        }}
        onCollisionExit={() => {
          contactCount.current = Math.max(0, contactCount.current - 1)
        }}
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
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          id={projectile.id}
          origin={projectile.origin}
          direction={projectile.direction}
          onExpire={handleProjectileExpire}
        />
      ))}
    </>
  )
}

type ProjectileProps = ProjectileInstance & {
  onExpire: (id: number) => void
}

/**
 * Simple physics-driven projectile fired from the player's weapon.
 */
function Projectile({ id, origin, direction, onExpire }: ProjectileProps): ReactElement {
  const bodyRef = useRef<RapierRigidBody | null>(null)

  useEffect(() => {
    const body = bodyRef.current
    if (body) {
      body.setLinvel(
        {
          x: direction[0] * PROJECTILE_SPEED,
          y: direction[1] * PROJECTILE_SPEED,
          z: direction[2] * PROJECTILE_SPEED,
        },
        true,
      )
    }

    const timeout = window.setTimeout(() => onExpire(id), PROJECTILE_LIFETIME_MS)
    return () => window.clearTimeout(timeout)
  }, [direction, id, onExpire])

  return (
    <RigidBody
      ref={bodyRef}
      position={origin}
      colliders="ball"
      friction={0}
      restitution={0.3}
      linearDamping={0}
      angularDamping={0}
      canSleep={false}
      gravityScale={0}
      ccd
    >
      <mesh castShadow>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} />
      </mesh>
    </RigidBody>
  )
}
