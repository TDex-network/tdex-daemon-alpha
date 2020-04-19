function inRange(x: number, expected: number, spread: number) {
  const min = expected - spread;
  const max = expected + spread;
  return (x - min) * (x - max) <= 0;
}

function minusFee(amount: number, fee: number): Array<any> {
  const calculatedFee = Math.floor((amount / 100) * fee);
  return [amount - calculatedFee, calculatedFee];
}

function calculateExpectedAmount(
  proposeBalance: number,
  receiveBalance: number,
  proposedAmount: number,
  fee: number
): number {
  const invariant = proposeBalance * receiveBalance;

  const newProposeBalance = proposeBalance + proposedAmount;
  const newReceiveBalance = invariant / newProposeBalance;
  const expectedAmount = receiveBalance - newReceiveBalance;
  const [expectedAmountMinusFee] = minusFee(expectedAmount, fee);
  return Math.floor(expectedAmountMinusFee);
}

export { inRange, calculateExpectedAmount };
