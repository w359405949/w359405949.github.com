const STATE_MASK = 0xc0;
const STATES = Object.freeze([
  {value: 0x00, label: ""},
  {value: 0x80, label: "损"},
  {value: 0xc0, label: "坏"},
]);

export function vehicleEquipmentState(raw) {
  if (!Number.isInteger(raw) || raw < 0 || raw > 0xff) return null;
  const high = raw & STATE_MASK;
  return STATES.find(state => state.value === high || (high === 0x40 && state.value === 0x80)) || null;
}

export function vehicleEquipmentStateOptions() {
  return STATES;
}

export function writeVehicleEquipmentState(raw, state) {
  if (!vehicleEquipmentState(raw) || !STATES.some(entry => entry.value === state)) {
    throw new RangeError("战车装备状态不属于三态");
  }
  return (raw & ~STATE_MASK) | state;
}
