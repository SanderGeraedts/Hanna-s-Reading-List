// The creatures' 3D models: import from here. makeCreature lives next to the
// models (models/index.ts) so model.ts and the model files don't import each other.
export * from './model'
export { CREATURE_MODELS, makeCreature, modelFor } from './models'
