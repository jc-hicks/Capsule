const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const hashString = (input) => {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

// Turn a 32-bit number into a fixed-length string over ALPHABET.
const encode = (value, length) => {
  let code = "";
  let remaining = value;
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[remaining % ALPHABET.length];
    remaining = Math.floor(remaining / ALPHABET.length);
  }
  return code;
};

// Generate a 8-character share code. Mixing the seed with a random component
// and the current time keeps codes distinct even for identical seeds.
export const generateShareCode = (seed = "") => {
  const salt = `${seed}:${Date.now()}:${Math.random()}`;
  const first = hashString(salt);
  const second = hashString(`${salt}:${first}`);
  return encode(first, 4) + encode(second, 4);
};

// Normalize user-typed codes: uppercase, strip whitespace/dashes.
export const normalizeShareCode = (code) =>
  typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
