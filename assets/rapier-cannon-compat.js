import RAPIER from "./vendor/rapier3d-compat-0.19.3.mjs";

await RAPIER.init();

export const RAPIER_VERSION = RAPIER.version();

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const vectorObject = vector => ({ x: vector.x, y: vector.y, z: vector.z });
const rotationObject = quaternion => ({
  x: quaternion.x,
  y: quaternion.y,
  z: quaternion.z,
  w: quaternion.w
});

export class Vec3 {
  constructor(x = 0, y = 0, z = 0, onChange = null) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._onChange = onChange;
    this._dirty = true;
  }

  get x() { return this._x; }
  set x(value) { this._setComponent("_x", value); }
  get y() { return this._y; }
  set y(value) { this._setComponent("_y", value); }
  get z() { return this._z; }
  set z(value) { this._setComponent("_z", value); }

  _setComponent(key, value) {
    const next = finite(value);
    if (this[key] === next) return;
    this[key] = next;
    this._dirty = true;
    this._onChange?.();
  }

  _setSilently(x, y, z) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._dirty = false;
    return this;
  }

  _setOnChange(onChange) {
    this._onChange = onChange;
    return this;
  }

  set(x, y, z) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._dirty = true;
    this._onChange?.();
    return this;
  }

  copy(source) {
    return this.set(source?.x, source?.y, source?.z);
  }

  clone() {
    return new Vec3(this.x, this.y, this.z);
  }
}

export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1, onChange = null) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._w = finite(w, 1);
    this._onChange = onChange;
    this._dirty = true;
  }

  get x() { return this._x; }
  set x(value) { this._setComponent("_x", value); }
  get y() { return this._y; }
  set y(value) { this._setComponent("_y", value); }
  get z() { return this._z; }
  set z(value) { this._setComponent("_z", value); }
  get w() { return this._w; }
  set w(value) { this._setComponent("_w", value, 1); }

  _setComponent(key, value, fallback = 0) {
    const next = finite(value, fallback);
    if (this[key] === next) return;
    this[key] = next;
    this._dirty = true;
    this._onChange?.();
  }

  _setSilently(x, y, z, w) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._w = finite(w, 1);
    this._dirty = false;
    return this;
  }

  _setOnChange(onChange) {
    this._onChange = onChange;
    return this;
  }

  set(x, y, z, w) {
    this._x = finite(x);
    this._y = finite(y);
    this._z = finite(z);
    this._w = finite(w, 1);
    this._dirty = true;
    this._onChange?.();
    return this;
  }

  copy(source) {
    return this.set(source?.x, source?.y, source?.z, source?.w);
  }

  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }

  setFromAxisAngle(axis, angle) {
    const halfAngle = finite(angle) * 0.5;
    const sine = Math.sin(halfAngle);
    return this.set(
      finite(axis?.x) * sine,
      finite(axis?.y) * sine,
      finite(axis?.z) * sine,
      Math.cos(halfAngle)
    );
  }

  setFromEuler(x, y, z, order = "XYZ") {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);
    const values = {
      XYZ: [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3
      ],
      YXZ: [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3
      ],
      ZXY: [
        s1 * c2 * c3 - c1 * s2 * s3,
        c1 * s2 * c3 + s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3
      ],
      ZYX: [
        s1 * c2 * c3 - c1 * s2 * s3,
        c1 * s2 * c3 + s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3
      ],
      YZX: [
        s1 * c2 * c3 + c1 * s2 * s3,
        c1 * s2 * c3 + s1 * c2 * s3,
        c1 * c2 * s3 - s1 * s2 * c3,
        c1 * c2 * c3 - s1 * s2 * s3
      ],
      XZY: [
        s1 * c2 * c3 - c1 * s2 * s3,
        c1 * s2 * c3 - s1 * c2 * s3,
        c1 * c2 * s3 + s1 * s2 * c3,
        c1 * c2 * c3 + s1 * s2 * s3
      ]
    }[order];
    if (!values) throw new Error(`Euler order ${order} is not supported`);
    return this.set(...values);
  }
}

let nextMaterialId = 1;

export class Material {
  constructor(name = "") {
    this.id = nextMaterialId++;
    this.name = String(name || "");
    this._rapierFriction = 0.3;
    this._rapierRestitution = 0;
  }
}

export class ContactMaterial {
  constructor(materialA, materialB, options = {}) {
    this.materials = [materialA, materialB];
    this.friction = Math.max(0, finite(options.friction, 0.3));
    this.restitution = Math.max(0, finite(options.restitution));
    this.contactEquationStiffness = options.contactEquationStiffness;
    this.contactEquationRelaxation = options.contactEquationRelaxation;
  }
}

class Shape {
  constructor() {
    this.material = null;
    this._body = null;
    this._dirty = true;
  }

  _markDirty() {
    this._dirty = true;
    if (this._body) this._body._shapeDirty = true;
  }

  updateConvexPolyhedronRepresentation() {
    this._markDirty();
  }

  updateBoundingSphereRadius() {}
}

export class Box extends Shape {
  constructor(halfExtents = new Vec3(0.5, 0.5, 0.5)) {
    super();
    this.halfExtents = new Vec3(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
      () => this._markDirty()
    );
  }
}

export class Sphere extends Shape {
  constructor(radius = 1) {
    super();
    this._radius = Math.max(0.00001, finite(radius, 1));
  }

  get radius() { return this._radius; }
  set radius(value) {
    this._radius = Math.max(0.00001, finite(value, 1));
    this._markDirty();
  }
}

export class Cylinder extends Shape {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, numSegments = 8) {
    super();
    this.radiusTop = Math.max(0.00001, finite(radiusTop, 1));
    this.radiusBottom = Math.max(0.00001, finite(radiusBottom, 1));
    this.height = Math.max(0.00001, finite(height, 1));
    this.numSegments = Math.max(3, Math.floor(finite(numSegments, 8)));
  }

  get radius() {
    return (this.radiusTop + this.radiusBottom) * 0.5;
  }
}

const trackedVector = (value, onChange) => new Vec3(
  value?.x,
  value?.y,
  value?.z,
  onChange
);

const trackedQuaternion = (value, onChange) => new Quaternion(
  value?.x,
  value?.y,
  value?.z,
  value?.w,
  onChange
);

export class Body {
  static DYNAMIC = 1;
  static STATIC = 2;
  static KINEMATIC = 4;
  static AWAKE = 0;
  static SLEEPY = 1;
  static SLEEPING = 2;

  constructor(options = {}) {
    this._world = null;
    this._rawBody = null;
    this._colliderRecords = [];
    this.shapes = [];
    this.shapeOffsets = [];
    this.shapeOrientations = [];
    this.material = options.material || null;
    this.allowSleep = options.allowSleep !== false;
    this.sleepSpeedLimit = finite(options.sleepSpeedLimit, 0.1);
    this.sleepTimeLimit = finite(options.sleepTimeLimit, 1);
    this.linearDamping = Math.max(0, finite(options.linearDamping));
    this.angularDamping = Math.max(0, finite(options.angularDamping));
    this._mass = Math.max(0, finite(options.mass));
    this._type = options.type ?? (this._mass > 0 ? Body.DYNAMIC : Body.STATIC);
    this._collisionFilterGroup = options.collisionFilterGroup ?? 1;
    this._collisionFilterMask = options.collisionFilterMask ?? -1;
    this._positionDirty = true;
    this._rotationDirty = true;
    this._velocityDirty = true;
    this._angularVelocityDirty = true;
    this._factorDirty = true;
    this._filterDirty = true;
    this._massDirty = true;
    this._typeDirty = true;
    this._shapeDirty = true;
    this.position = trackedVector(options.position, () => { this._positionDirty = true; });
    this.velocity = trackedVector(options.velocity, () => { this._velocityDirty = true; });
    this.angularVelocity = trackedVector(options.angularVelocity, () => { this._angularVelocityDirty = true; });
    this.force = trackedVector(null, () => {});
    this.torque = trackedVector(null, () => {});
    this.quaternion = trackedQuaternion(options.quaternion, () => { this._rotationDirty = true; });
    this.linearFactor = new Vec3(1, 1, 1, () => { this._factorDirty = true; });
    this.angularFactor = new Vec3(1, 1, 1, () => { this._factorDirty = true; });
    this.aabbNeedsUpdate = true;
  }

  get mass() { return this._mass; }
  set mass(value) {
    this._mass = Math.max(0, finite(value));
    this._massDirty = true;
  }

  get type() { return this._type; }
  set type(value) {
    this._type = value;
    this._typeDirty = true;
  }

  get collisionFilterGroup() { return this._collisionFilterGroup; }
  set collisionFilterGroup(value) {
    this._collisionFilterGroup = finite(value, 1) | 0;
    this._filterDirty = true;
  }

  get collisionFilterMask() { return this._collisionFilterMask; }
  set collisionFilterMask(value) {
    this._collisionFilterMask = finite(value, -1) | 0;
    this._filterDirty = true;
  }

  get sleepState() {
    if (this._rawBody?.isSleeping()) return Body.SLEEPING;
    return Body.AWAKE;
  }

  addShape(shape, offset = new Vec3(), orientation = new Quaternion()) {
    shape._body = this;
    shape._dirty = true;
    const shapeIndex = this.shapes.length;
    this.shapes.push(shape);
    this.shapeOffsets.push(trackedVector(offset, () => {
      const record = this._colliderRecords[shapeIndex];
      record && (record.transformDirty = true);
    }));
    this.shapeOrientations.push(trackedQuaternion(orientation, () => {
      const record = this._colliderRecords[shapeIndex];
      record && (record.transformDirty = true);
    }));
    this._shapeDirty = true;
    return this;
  }

  wakeUp() {
    this._rawBody?.wakeUp();
  }

  sleep() {
    this._rawBody?.sleep();
  }

  updateMassProperties() {
    this._massDirty = true;
    this._world?._applyBodyMass(this);
  }

  updateBoundingRadius() {}

  _syncFromRapier() {
    if (!this._rawBody?.isValid()) return;
    const position = this._rawBody.translation();
    const rotation = this._rawBody.rotation();
    const velocity = this._rawBody.linvel();
    const angularVelocity = this._rawBody.angvel();
    this.position._setSilently(position.x, position.y, position.z);
    this.quaternion._setSilently(rotation.x, rotation.y, rotation.z, rotation.w);
    this.velocity._setSilently(velocity.x, velocity.y, velocity.z);
    this.angularVelocity._setSilently(angularVelocity.x, angularVelocity.y, angularVelocity.z);
    this._positionDirty = false;
    this._rotationDirty = false;
    this._velocityDirty = false;
    this._angularVelocityDirty = false;
  }
}

export class SAPBroadphase {
  constructor(world) {
    this.world = world;
    this.dirty = false;
  }
}

const rapierBodyType = type => {
  if (type === Body.KINEMATIC) return RAPIER.RigidBodyType.KinematicVelocityBased;
  if (type === Body.STATIC) return RAPIER.RigidBodyType.Fixed;
  return RAPIER.RigidBodyType.Dynamic;
};

const rapierBodyDescriptor = body => {
  let descriptor;
  if (body.type === Body.KINEMATIC) descriptor = RAPIER.RigidBodyDesc.kinematicVelocityBased();
  else if (body.type === Body.STATIC) descriptor = RAPIER.RigidBodyDesc.fixed();
  else descriptor = RAPIER.RigidBodyDesc.dynamic();
  descriptor
    .setTranslation(body.position.x, body.position.y, body.position.z)
    .setRotation(rotationObject(body.quaternion))
    .setLinearDamping(body.linearDamping)
    .setAngularDamping(body.angularDamping)
    .setCanSleep(body.allowSleep);
  if (body.type !== Body.STATIC) {
    descriptor
      .setLinvel(body.velocity.x, body.velocity.y, body.velocity.z)
      .setAngvel(vectorObject(body.angularVelocity));
  }
  return descriptor;
};

const collisionGroups = body => (
  (((body.collisionFilterGroup & 0xffff) << 16) | (body.collisionFilterMask & 0xffff)) >>> 0
);

const colliderDescriptor = shape => {
  if (shape instanceof Box) {
    return RAPIER.ColliderDesc.cuboid(
      shape.halfExtents.x,
      shape.halfExtents.y,
      shape.halfExtents.z
    );
  }
  if (shape instanceof Sphere) return RAPIER.ColliderDesc.ball(shape.radius);
  if (shape instanceof Cylinder) return RAPIER.ColliderDesc.cylinder(shape.height * 0.5, shape.radius);
  throw new Error(`Unsupported validation collider: ${shape?.constructor?.name || "unknown"}`);
};

const solveMultiplicativeCoefficients = (contactMaterials, property) => {
  const values = new Map();
  const edges = contactMaterials.map(contactMaterial => ({
    a: contactMaterial.materials[0],
    b: contactMaterial.materials[1],
    target: Math.max(0, finite(contactMaterial[property]))
  }));

  edges.forEach(edge => {
    if (edge.a !== edge.b) return;
    values.set(edge.a, Math.sqrt(edge.target));
  });

  const resolveKnownEdges = () => {
    let progressed = false;
    edges.forEach(edge => {
      const hasA = values.has(edge.a);
      const hasB = values.has(edge.b);
      if (hasA === hasB) return;
      const knownMaterial = hasA ? edge.a : edge.b;
      const unknownMaterial = hasA ? edge.b : edge.a;
      const knownValue = values.get(knownMaterial);
      if (knownValue === 0 && edge.target > 0) return;
      values.set(unknownMaterial, knownValue === 0 ? 0 : edge.target / knownValue);
      progressed = true;
    });
    return progressed;
  };

  while (resolveKnownEdges()) {}
  while (edges.some(edge => !values.has(edge.a) || !values.has(edge.b))) {
    const edge = edges.find(candidate => !values.has(candidate.a) || !values.has(candidate.b));
    if (!values.has(edge.a) && !values.has(edge.b)) {
      if (edge.target === 0) {
        values.set(edge.a, 1);
        values.set(edge.b, 0);
      } else {
        const root = Math.sqrt(edge.target);
        values.set(edge.a, root);
        values.set(edge.b, root);
      }
    } else {
      const knownMaterial = values.has(edge.a) ? edge.a : edge.b;
      const unknownMaterial = knownMaterial === edge.a ? edge.b : edge.a;
      const knownValue = values.get(knownMaterial);
      values.set(unknownMaterial, knownValue === 0 ? 0 : edge.target / knownValue);
    }
    while (resolveKnownEdges()) {}
  }
  return values;
};

export class World {
  constructor(options = {}) {
    const gravity = options.gravity || new Vec3(0, -9.82, 0);
    this._rapierWorld = new RAPIER.World(vectorObject(gravity));
    this.bodies = [];
    this.contacts = [];
    this.accumulator = 0;
    this.allowSleep = true;
    this.broadphase = new SAPBroadphase(this);
    this._listeners = new Map();
    this._contactMaterials = [];
    this._colliderRecords = new Map();
    this.lastStepMilliseconds = 0;
    this.lastSubsteps = 0;
    this.lastContactCount = 0;
    this.totalStepMilliseconds = 0;
    this.totalMeasuredFrames = 0;
    const solver = { tolerance: 0.001 };
    Object.defineProperty(solver, "iterations", {
      enumerable: true,
      get: () => this._rapierWorld.numSolverIterations,
      set: value => { this._rapierWorld.numSolverIterations = Math.max(1, Math.floor(finite(value, 4))); }
    });
    this.solver = solver;
  }

  addContactMaterial(contactMaterial) {
    this._contactMaterials.push(contactMaterial);
    this._recomputeMaterialCoefficients();
  }

  addEventListener(type, listener) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this._listeners.get(type)?.delete(listener);
  }

  _dispatch(type) {
    this._listeners.get(type)?.forEach(listener => listener({ type, target: this }));
  }

  addBody(body) {
    if (body._world === this) return body;
    if (body._world) body._world.removeBody(body);
    body._world = this;
    body._rawBody = this._rapierWorld.createRigidBody(rapierBodyDescriptor(body));
    body._colliderRecords = body.shapes.map((shape, index) => {
      const offset = body.shapeOffsets[index];
      const orientation = body.shapeOrientations[index];
      const material = shape.material || body.material;
      const descriptor = colliderDescriptor(shape)
        .setTranslation(offset.x, offset.y, offset.z)
        .setRotation(rotationObject(orientation))
        .setFriction(material?._rapierFriction ?? 0.3)
        .setRestitution(material?._rapierRestitution ?? 0)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
        .setCollisionGroups(collisionGroups(body));
      if (body.type === Body.DYNAMIC && body.mass > 0) {
        descriptor.setMass(body.mass / Math.max(1, body.shapes.length));
      } else {
        descriptor.setDensity(0);
      }
      const collider = this._rapierWorld.createCollider(descriptor, body._rawBody);
      const record = { body, shape, collider, offset, orientation, material, transformDirty: false };
      this._colliderRecords.set(collider.handle, record);
      return record;
    });
    this.bodies.push(body);
    this._applyBodyFactors(body);
    body._typeDirty = false;
    body._filterDirty = false;
    body._massDirty = false;
    body._shapeDirty = false;
    body.shapes.forEach(shape => { shape._dirty = false; });
    body._syncFromRapier();
    return body;
  }

  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index >= 0) this.bodies.splice(index, 1);
    body._colliderRecords.forEach(record => this._colliderRecords.delete(record.collider.handle));
    if (body._rawBody?.isValid()) this._rapierWorld.removeRigidBody(body._rawBody);
    body._colliderRecords = [];
    body._rawBody = null;
    body._world = null;
    this.contacts = this.contacts.filter(contact => contact.bi !== body && contact.bj !== body);
  }

  _recomputeMaterialCoefficients() {
    const friction = solveMultiplicativeCoefficients(this._contactMaterials, "friction");
    const restitution = solveMultiplicativeCoefficients(this._contactMaterials, "restitution");
    const materials = new Set(this._contactMaterials.flatMap(contactMaterial => contactMaterial.materials));
    materials.forEach(material => {
      material._rapierFriction = friction.get(material) ?? 0.3;
      material._rapierRestitution = restitution.get(material) ?? 0;
    });
    this.bodies.forEach(body => body._colliderRecords.forEach(record => {
      const material = record.shape.material || body.material;
      record.material = material;
      record.collider.setFriction(material?._rapierFriction ?? 0.3);
      record.collider.setRestitution(material?._rapierRestitution ?? 0);
    }));
  }

  _applyBodyFactors(body) {
    if (!body._rawBody?.isValid()) return;
    body._rawBody.setEnabledTranslations(
      body.linearFactor.x !== 0,
      body.linearFactor.y !== 0,
      body.linearFactor.z !== 0,
      true
    );
    body._rawBody.setEnabledRotations(
      body.angularFactor.x !== 0,
      body.angularFactor.y !== 0,
      body.angularFactor.z !== 0,
      true
    );
    body._factorDirty = false;
  }

  _applyBodyMass(body) {
    if (!body._rawBody?.isValid()) return;
    const shapeMass = body.type === Body.DYNAMIC && body.mass > 0
      ? body.mass / Math.max(1, body._colliderRecords.length)
      : 0;
    body._colliderRecords.forEach(record => record.collider.setMass(shapeMass));
    body._rawBody.recomputeMassPropertiesFromColliders();
    body._massDirty = false;
  }

  _applyShapeChanges(body) {
    body._colliderRecords.forEach(record => {
      if (record.shape._dirty) {
        if (record.shape instanceof Box) {
          record.collider.setHalfExtents(vectorObject(record.shape.halfExtents));
        } else if (record.shape instanceof Sphere) {
          record.collider.setRadius(record.shape.radius);
        } else if (record.shape instanceof Cylinder) {
          record.collider.setHalfHeight(record.shape.height * 0.5);
          record.collider.setRadius(record.shape.radius);
        }
        record.shape._dirty = false;
      }
      if (record.transformDirty) {
        record.collider.setTranslationWrtParent(vectorObject(record.offset));
        record.collider.setRotationWrtParent(rotationObject(record.orientation));
        record.transformDirty = false;
      }
    });
    body._shapeDirty = false;
  }

  _prepareBody(body) {
    const rawBody = body._rawBody;
    if (!rawBody?.isValid()) return;
    if (body._typeDirty) {
      rawBody.setBodyType(rapierBodyType(body.type), true);
      body._typeDirty = false;
      body._massDirty = true;
    }
    if (body._shapeDirty || body.shapes.some(shape => shape._dirty)) this._applyShapeChanges(body);
    if (body._filterDirty) {
      const groups = collisionGroups(body);
      body._colliderRecords.forEach(record => record.collider.setCollisionGroups(groups));
      body._filterDirty = false;
    }
    if (body._massDirty) this._applyBodyMass(body);
    if (body._factorDirty) this._applyBodyFactors(body);
    if (body._positionDirty) rawBody.setTranslation(vectorObject(body.position), true);
    if (body._rotationDirty) rawBody.setRotation(rotationObject(body.quaternion), true);
    if (body.type !== Body.STATIC) {
      rawBody.resetForces(false);
      rawBody.resetTorques(false);
      if (body._velocityDirty) rawBody.setLinvel(vectorObject(body.velocity), true);
      if (body._angularVelocityDirty) rawBody.setAngvel(vectorObject(body.angularVelocity), true);
      if (body.force.x || body.force.y || body.force.z) {
        rawBody.addForce(vectorObject(body.force), true);
        body.force._setSilently(0, 0, 0);
      }
      if (body.torque.x || body.torque.y || body.torque.z) {
        rawBody.addTorque(vectorObject(body.torque), true);
        body.torque._setSilently(0, 0, 0);
      }
    }
    body._positionDirty = false;
    body._rotationDirty = false;
    body._velocityDirty = false;
    body._angularVelocityDirty = false;
    body.aabbNeedsUpdate = false;
  }

  _syncContacts() {
    const contacts = [];
    const visitedPairs = new Set();
    for (const record of this._colliderRecords.values()) {
      if (!record.collider.isValid()) continue;
      this._rapierWorld.contactPairsWith(record.collider, otherCollider => {
        const otherRecord = this._colliderRecords.get(otherCollider.handle);
        if (!otherRecord || otherRecord.body === record.body) return;
        const firstRecord = record.collider.handle <= otherCollider.handle ? record : otherRecord;
        const secondRecord = firstRecord === record ? otherRecord : record;
        const pairKey = `${firstRecord.collider.handle}:${secondRecord.collider.handle}`;
        if (visitedPairs.has(pairKey)) return;
        visitedPairs.add(pairKey);
        this._rapierWorld.contactPair(
          firstRecord.collider,
          secondRecord.collider,
          (manifold, flipped) => {
            if (manifold.numContacts() === 0 && manifold.numSolverContacts() === 0) return;
            const rawNormal = manifold.normal();
            const direction = flipped ? -1 : 1;
            contacts.push({
              bi: firstRecord.body,
              bj: secondRecord.body,
              si: firstRecord.shape,
              sj: secondRecord.shape,
              ni: new Vec3(
                rawNormal.x * direction,
                rawNormal.y * direction,
                rawNormal.z * direction
              )
            });
          }
        );
      });
    }
    this.contacts = contacts;
    this.lastContactCount = contacts.length;
  }

  step(fixedTimeStep = 1 / 60, timeSinceLastCalled, maxSubSteps = 10) {
    const fixed = Math.max(1 / 1000, finite(fixedTimeStep, 1 / 60));
    let substeps = 1;
    if (Number.isFinite(timeSinceLastCalled)) {
      this.accumulator += Math.max(0, timeSinceLastCalled);
      substeps = Math.min(
        Math.floor((this.accumulator + 1e-10) / fixed),
        Math.max(1, Math.floor(maxSubSteps))
      );
      if (substeps === 0) {
        this.lastSubsteps = 0;
        this.lastStepMilliseconds = 0;
        return 0;
      }
      this.accumulator -= substeps * fixed;
    } else {
      this.accumulator = 0;
    }

    const startedAt = performance.now();
    this._rapierWorld.timestep = fixed;
    for (let index = 0; index < substeps; index += 1) {
      this._dispatch("preStep");
      this.bodies.forEach(body => this._prepareBody(body));
      this._rapierWorld.step();
      this.bodies.forEach(body => body._syncFromRapier());
      this._syncContacts();
    }
    this.lastStepMilliseconds = performance.now() - startedAt;
    this.lastSubsteps = substeps;
    this.totalStepMilliseconds += this.lastStepMilliseconds;
    this.totalMeasuredFrames += 1;
    this.broadphase.dirty = false;
    return substeps;
  }

  getValidationStats() {
    return {
      engine: `Rapier ${RAPIER_VERSION}`,
      bodies: this.bodies.length,
      contacts: this.lastContactCount,
      substeps: this.lastSubsteps,
      physicsMilliseconds: this.lastStepMilliseconds,
      averagePhysicsMilliseconds: this.totalMeasuredFrames
        ? this.totalStepMilliseconds / this.totalMeasuredFrames
        : 0
    };
  }

  destroy() {
    this.contacts = [];
    this.bodies.forEach(body => {
      body._rawBody = null;
      body._world = null;
      body._colliderRecords = [];
    });
    this.bodies = [];
    this._colliderRecords.clear();
    this._rapierWorld.free();
  }
}

