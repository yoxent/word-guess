export function computeLetterKeyWidth(
  keyboardWidth: number,
  maxKeysPerRow: number,
  gap: number,
): number {
  if (keyboardWidth <= 0 || maxKeysPerRow < 1) return 0;
  return (keyboardWidth - gap * (maxKeysPerRow - 1)) / maxKeysPerRow;
}

export function computeTileSize(args: {
  screenWidth: number;
  wordLength: number;
  maxAttempts: number;
  boardAreaHeight: number;
  tileGap: number;
  horizontalPadding: number;
  minTile: number;
  maxTile: number;
  attemptsLabelBlock: number;
}): number {
  const {
    screenWidth,
    wordLength,
    maxAttempts,
    boardAreaHeight,
    tileGap,
    horizontalPadding,
    minTile,
    maxTile,
    attemptsLabelBlock,
  } = args;

  const availableWidth =
    screenWidth - horizontalPadding - (wordLength - 1) * tileGap;
  const widthBased = Math.floor(availableWidth / wordLength);

  // Fits the cluster (label + rows) inside the board slot. Leftover
  // height grows tiles up to width/maxTile; slack around the cluster
  // is centered by GameBoard. 10-letter rows stay width-capped.
  let size = widthBased;
  if (boardAreaHeight > 0 && maxAttempts > 0) {
    const gaps = (maxAttempts - 1) * tileGap;
    const heightBased = Math.floor(
      (boardAreaHeight - attemptsLabelBlock - gaps) / maxAttempts,
    );
    size = Math.min(size, heightBased);
  }

  return Math.max(minTile, Math.min(maxTile, size));
}
