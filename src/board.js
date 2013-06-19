var WHITE = 1;
var NONE = 0;
var BLACK = -1;

// Square logic functions

function rawFromRankFile(rankIndex, fileIndex) {
  return rankIndex * 8 + fileIndex;
}

function rankFromRaw(squareIndex) {
  return (squareIndex & ~7) >> 3;
}

function fileFromRaw(squareIndex) {
  return squareIndex & 7;
}

function isLegalSquareRaw(squareIndex) {
  return squareIndex >= 0 && squareIndex < 64;
}

function isLegalSquare(rankIndex, fileIndex) {
  return rankIndex >= 0 && rankIndex < 8 && fileIndex >= 0 && fileIndex < 8;
}

// Function conversion decorators

function rawToRankFile(callable) {
  return function(rankIndex, fileIndex) {
    if (isLegalSquare(rankIndex, fileIndex)) {
      args = Array.apply(undefined, arguments);
      args.splice(0, 2);
      args.unshift(rawFromRankFile(rankIndex, fileIndex));
      return callable.apply(this, args);
    }
    console.log(rankIndex);
    console.log(fileIndex);
    throw "Illegal square provided.";
  }
}

function rankFileToRaw(callable) {
  return function(squareIndex) {
    args = Array.apply(undefined, arguments);
    args.splice(0, 1);
    args.unshift(fileFromRaw(squareIndex));
    args.unshift(rankFromRaw(squareIndex));
    return callable.apply(this, args);
  }
}

function rawToRankFileSrcDst(callable) {
  return function(srcRank, srcFile, dstRank, dstFile) {
    if (isLegalSquare(srcRank, srcFile) && isLegalSquare(dstRank, dstFile)) {
      args = Array.apply(undefined, arguments);
      args.splice(0, 4);
      args.unshift(srcRank*8 + srcFile);
      args.unshift(dstRank*8 + dstFile);
      return callable.apply(this, args);
    }
    throw "Illegal square provided.";
  };
}

// Square Iterators

function DirectionalIterator(rankIndex, fileIndex, rankDirection, fileDirection) {
  this.rankIndex = rankIndex;
  this.fileIndex = fileIndex;
  this.rankDirection = rankDirection;
  this.fileDirection = fileDirection;
}

DirectionalIterator.prototype = {
  hasNext: function() {
    return isLegalSquare(
  	  this.rankIndex + this.rankDirection,
  	  this.fileIndex + this.fileDirection
    );
  },
  next: function() {
    this.rankIndex += this.rankDirection;
    this.fileIndex += this.fileDirection;
    return rawFromRankFile(this.rankIndex, this.fileIndex);
  }
}

function OneSquareIterator(rankIndex, fileIndex) {
  this.rankIndex = rankIndex;
  this.fileIndex = fileIndex;
  this.used = false;
}

OneSquareIterator.prototype = {
  hasNext: function() {
    if(!isLegalSquare(this.rankIndex, this.fileIndex)) return false;
    return !this.used;
  },
  next: function() {
    if(!this.hasNext()) throw "No More Items";
    this.used = true;
    return rawFromRankFile(this.rankIndex, this.fileIndex);
  }
}

// Pieces

var Piece = {
  moveIterators: function(rankIndex, fileIndex) {
    return _.map(this.directions, function(direction) {
      return new OneSquareIterator(rankIndex + direction[0], fileIndex + direction[1]);
    });
  },
  findSpecialMoves: function(rankIndex, fileIndex, chessRules) {
    return [];
  },
  getName: function() {
    if(this.color == BLACK) {
      return this.pieceCharacter.toUpperCase()
    }
    return this.pieceCharacter;
  }
};

Piece.find = function(chessBoard, destination, sourceRank, sourceFile, color) {
  var destRank = rankFromRaw(destination);
  var destFile = fileFromRaw(destination);
  var rankDelta = !isNaN(parseInt(sourceRank)) ? sourceRank - destRank : null;
  var fileDelta = !isNaN(parseInt(sourceFile)) ? sourceFile - destFile : null;
  var sourceRank, sourceFile;
  color = color ? color : chessBoard.action;
  var direction = _.find(this.directions, function(direction) {
    if(!(rankDelta === null) && direction[0] != rankDelta) return false;
    if(!(fileDelta === null) && direction[1] != fileDelta) return false;
    sourceRank = destRank + direction[0];
    sourceFile = destFile + direction[1];
    if(!isLegalSquare(sourceRank, sourceFile)) return false;
    var foundPiece = chessBoard.getPiece(sourceRank, sourceFile);
    return foundPiece.pieceCharacter == this.pieceCharacter && foundPiece.color == color;
  }, this);
  if(direction) return rawFromRankFile(sourceRank, sourceFile);
}

Piece.__defineGetter__('squareIndex', function () {
  return this.board.board.indexOf(this);
});

Piece.__defineGetter__('rankIndex', function () {
  return rankFromRaw(this.squareIndex);
});

Piece.__defineGetter__('fileIndex', function () {
  return fileFromRaw(this.squareIndex);
});

var SlidingPiece = Object.create(Piece);

SlidingPiece.moveIterators = function(rankIndex, fileIndex) {
  return _.map(this.directions, function(direction) {
    return new DirectionalIterator(rankIndex, fileIndex, direction[0], direction[1]);
  });
}

SlidingPiece.find = function(chessBoard, destination, sourceRank, sourceFile) {
  var destRank = rankFromRaw(destination);
  var destFile = fileFromRaw(destination);
  var rankDelta = !isNaN(parseInt(sourceRank)) ? sourceRank - destRank : null;
  var fileDelta = !isNaN(parseInt(sourceFile)) ? sourceFile - destFile : null;
  var sourceRank, sourceFile;
  
}

var EmptySquare = Object.create(Piece);
EmptySquare.color = NONE;
EmptySquare.pieceCharacter = " ";

function buildPieceType(directions, prototype, pieceCharacter) {
  var PieceType = function(color, board) {
    this.color = color;
    this.board = board;
  };
  PieceType.prototype = Object.create(prototype);
  PieceType.prototype.directions = directions
  PieceType.prototype.pieceCharacter = pieceCharacter;
  PieceType.find = prototype.find.bind(PieceType.prototype);
  return PieceType;
}

var diagonals = [[-1, 1], [1, -1], [1, 1], [-1, -1]];
var straights = [[1, 0], [-1, 0], [0, 1], [0, -1]];
var all = _.union(diagonals, straights);
var knightDeltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
var backRankSquares = {};
backRankSquares[WHITE] = 0;
backRankSquares[BLACK] = 7;


var Knight = buildPieceType(knightDeltas, Piece, 'n');
var Queen = buildPieceType(all, SlidingPiece, 'q');
var Rook = buildPieceType(straights, SlidingPiece, 'r');
var Bishop = buildPieceType(diagonals, SlidingPiece, 'b');

var King = buildPieceType(all, Piece, 'k');
King.prototype.findSpecialMoves = function (rankIndex, fileIndex, board) {
  var availableCastles = [];
  var backRank = this.color == WHITE ? 0 : 7;
  if (board.canCastleKingside(this.color) && _.all(
    _.map(_.range(5, 7), function(file) {
      return board.getPiece(backRank, file).color == NONE;
    })))
    availableCastles.push(rawFromRankFile(backRank, 6));
  if (board.canCastleQueenside(this.color) && _.all(
    _.map(_.range(1, 4), function(file) {
      return board.getPiece(backRank, file).color == NONE;
    })))
    availableCastles.push(rawFromRankFile(backRank, 2));
  return availableCastles;
}

var Pawn = buildPieceType([1, 0], Piece, 'p');
Pawn.prototype.enpassantSquares = {};
Pawn.prototype.enpassantSquares[WHITE] = 4;
Pawn.prototype.enpassantSquares[BLACK] = 3;
Pawn.prototype.moveIterators = function(rankIndex, fileIndex) {
  return [];
};

Pawn.prototype.findSpecialMoves = function(rankIndex, fileIndex, board) {
  var newRankIndex = rankIndex + this.color;
  var foundMoves = [];
  // Check for legal takes.
  _.each([-1 + fileIndex, 1 + fileIndex], function(newFileIndex) {
    if(!isLegalSquare(newRankIndex, newFileIndex)) return;
    if(board.getPiece(newRankIndex, newFileIndex).color == this.color*(-1) || 
       this.isEnpassantAvailable(newRankIndex, newFileIndex, board))
      foundMoves.push(rawFromRankFile(newRankIndex, newFileIndex));
  }, this);
  if(board.getPiece(newRankIndex, fileIndex).color == NONE)
    foundMoves.push(rawFromRankFile(newRankIndex, fileIndex));
  newRankIndex += this.color;
  if(rankIndex == backRankSquares[this.color] + this.color && board.getPiece(newRankIndex, fileIndex).color == NONE)
    foundMoves.push(rawFromRankFile(newRankIndex, fileIndex));
  return foundMoves;
}

Pawn.prototype.isEnpassantAvailable = function(rankIndex, fileIndex, board) {
  if(this.rankIndex != this.enpassantSquares[this.color]) return false;
  var lastMove = _.last(board.moves);
  if(!lastMove) return false;
  return lastMove.piece instanceof Pawn &&
     lastMove.sourceFile == fileIndex &&
     lastMove.sourceRank == rankIndex + this.color &&
     lastMove.destRank == rankIndex - this.color;
}

var pieces = {k: King, q: Queen, r: Rook, b: Bishop, n: Knight, p: Pawn};
var promotionPieces = [Queen, Rook, Bishop, Knight];

function Move(sourceIndex, destIndex, promotion) {
  this.sourceIndex = sourceIndex;
  this.destIndex = destIndex;
  this.promotion = promotion;
}

Move.prototype.__defineGetter__('sourceRank', function() {
  return rankFromRaw(this.sourceIndex);
});

Move.prototype.__defineGetter__('sourceFile', function() {
  return fileFromRaw(this.sourceIndex);
});

Move.prototype.__defineGetter__('destRank', function() {
  return rankFromRaw(this.destIndex);
});

Move.prototype.__defineGetter__('destFile', function() {
  return fileFromRaw(this.destIndex);
});

Move.prototype.equals = function(move) {
  return this.sourceIndex == move.sourceIndex &&
    this.destIndex == move.destIndex &&
    this.promotion == move.promotion;
}

function buildMove(srcRank, srcFile, dstRank, dstFile, promotion) {
  return new Move(
  	rawFromRankFile(srcRank, srcFile),
  	rawFromRankFile(dstRank, dstFile),
  	promotion
  );
}

function ChessBoard() {
  this.reset()
  this.listeners = []
}

ChessBoard.prototype.reset = function() {
  this.board = _.flatten([
    this.majorPieceRowForColor(WHITE),
    _.map(_.range(8), function(index) {return new Pawn(WHITE, this)}, this),
    _.map(_.range(4*8), function(index) {return EmptySquare}),
    _.map(_.range(8), function(index) {return new Pawn(BLACK, this)}, this),
    this.majorPieceRowForColor(BLACK)
  ]);
  this.startingAction = WHITE;
  this.whiteKing = this.getPiece(0, 4);
  this.blackKing = this.getPiece(7, 4);
  this.moves = []
}

ChessBoard.prototype.makeLegalMove = function(move) {
  if(!this.isLegalMove(move.sourceIndex, move.destIndex)) 
    throw "The provided move is not a legal move.";
  var piece = this.getPieceRaw(move.sourceIndex);
  var promotion = null;

  // Ensure that a promotion was supplied if we are on a back rank.
  if(piece instanceof Pawn && (move.destRank == 0 || move.destRank == 7)) {
    if(promotionPieces.indexOf(move.promotion) < 0) throw "No promotion provided.";
    promotion = new move.promotion(piece.color);
  } else if(move.promotion) throw "Promotion not allowed for this move."
  
  // Check for castles. We make the rook move, and let the normal
  // move process handle making the king move.
  if(piece instanceof King && move.sourceFile == 4) {
    if(move.destinationFile == 6) 
      this.makeMove(move.sourceRank, 7, move.sourceRank, 5);
    if(move.destinationFile == 2)
      this.makeMove(move.sourceRank, 0, move.sourceRank, 3);
  }

  // Handle clearing the passed enpassant piece.
  if(piece instanceof Pawn && move.sourceFile != move.destFile &&
     this.getPieceRaw(move.destIndex).color == NONE)
    this.setPiece(move.destRank, move.sourceFile);
  
  _.extend(move, this.makeMoveRaw(move.sourceIndex, move.destIndex));
  if(promotion) this.setPieceRaw(move.destIndex, promotion);
  this.moves.push(move);
  return move;
}

ChessBoard.prototype.__defineGetter__('action', function () {
  return this.moves.length & 1 ? this.startingAction * -1 : this.startingAction;
});

ChessBoard.prototype.getPieceRaw = function(squareIndex) {
  return this.board[squareIndex];
}

ChessBoard.prototype.setPieceRaw = function(squareIndex, piece) {
  if(typeof(piece) === 'undefined') piece = EmptySquare;
  this.board[squareIndex] = piece;
}

ChessBoard.prototype.makeMoveRaw = function(sourceIndex, destIndex) {
  var takenPiece = this.getPieceRaw(destIndex);
  var piece = this.getPieceRaw(sourceIndex);
  this.setPieceRaw(sourceIndex, EmptySquare);
  this.setPieceRaw(destIndex, piece);
  return {piece: piece, takenPiece: takenPiece};
}

ChessBoard.prototype.isLegalMove = function(sourceIndex, destIndex) {
  return !(this.getLegalMovesRaw(sourceIndex).indexOf(destIndex) < 0);
}

ChessBoard.prototype.getLegalMovesRaw = function(squareIndex) {
  if(this.getPieceRaw(squareIndex).color != this.action) return [];
  return this.filterMovesForKingSafety(squareIndex, this.getMovesThreatenedByRaw(squareIndex));
}

ChessBoard.prototype.getMovesThreatenedBy = function(rankIndex, fileIndex) {
  var piece = this.getPiece(rankIndex, fileIndex);
  var threatenedMoves = [];
  _.each(piece.moveIterators(rankIndex, fileIndex), function (moveIterator) {
    var squareIndex = null;
    while(moveIterator.hasNext()) {
      squareIndex = moveIterator.next();
      targetPiece = this.getPieceRaw(squareIndex);
      switch(targetPiece.color) {
      case NONE:
        threatenedMoves.push(squareIndex);
        break;
      case piece.color:
        return;
        break;
      default:
        threatenedMoves.push(squareIndex);
        return;
      }
    }
  }, this);
  return _.union(threatenedMoves, piece.findSpecialMoves(rankIndex, fileIndex, this));
}

ChessBoard.prototype.filterMovesForKingSafety = function(startIndex, moves) {
  var movesToReturn = moves.slice(0);
  var piece = this.getPieceRaw(startIndex);
  var deltaBoard = new DeltaChessBoard(this);
  var backRankIndex = backRankSquares[piece.color];
  var startRank = rankFromRaw(startIndex);
  var startFile = fileFromRaw(startIndex);

  // Check for castling through check.
  if(piece instanceof King) {
    if(startRank == backRankIndex && startFile == 4) {
      var castleMoveIndex = movesToReturn.indexOf(rawFromRankFile(backRankIndex, 6));
      if(!(castleMoveIndex < 0) && this.isSquareInFileRangeAlongRankThreatened(backRankIndex, 4, 6, piece)) {
        movesToReturn.splice(castleMoveIndex, 1);
      }
      var castleMoveIndex = movesToReturn.indexOf(rawFromRankFile(backRankIndex, 2));
      if(!(castleMoveIndex < 0) && this.isSquareInFileRangeAlongRankThreatened(backRankIndex, 2, 5, piece)) {
        movesToReturn.splice(castleMoveIndex, 1);
      }
    }
  } else {
    deltaBoard.setPieceRaw(startIndex);
    if(!this.isSquareThreatenedRaw(this.getKingPosition(piece.color))) {
      return movesToReturn;
    }
  }
  return _.filter(movesToReturn, function(endIndex) {
    deltaBoard.resetToParent();
    deltaBoard.makeMoveRaw(startIndex, endIndex);
    return !deltaBoard.isKingThreatened(piece.color);
  }, this);
}

// King functions

ChessBoard.prototype.getKingPosition = function(color) {
  return (color == WHITE ? this.whiteKing : this.blackKing).squareIndex;
}

ChessBoard.prototype.isKingThreatened = function(color) {
  return this.isSquareThreatenedRaw(this.getKingPosition(color), color * -1);
}

ChessBoard.prototype.isSquareThreatenedRaw = function(squareIndex, byColor) {
  if(typeof(byColor) === 'undefined') byColor = this.getPieceRaw(squareIndex).color * -1;
  for(var i = 0; i < 64; i++) {
    if(this.getPieceRaw(i).color == byColor) {
      if(!(this.getMovesThreatenedByRaw(i).indexOf(squareIndex) < 0)) {
        return true;
      }
    }
  }
  return false;
}

ChessBoard.prototype.canCastleKingside = function(color) {
  return color == WHITE ? this.whiteCanCastleKingside : this.blackCanCastleKingside;
}

ChessBoard.prototype.canCastleQueenside = function(color) {
  return color == WHITE ? this.whiteCanCastleQueenside : this.blackCanCastleQueenside;
}

ChessBoard.prototype.__defineGetter__('whiteCanCastleKingside', function () {
  return !this.moveWasMadeFromSquares([rawFromRankFile(0, 4), rawFromRankFile(0, 7)]);
});

ChessBoard.prototype.__defineGetter__('whiteCanCastleQueenside', function () {
  return !this.moveWasMadeFromSquares([rawFromRankFile(0, 4), rawFromRankFile(0, 0)]);
});

ChessBoard.prototype.__defineGetter__('blackCanCastleKingside', function () {
  return !this.moveWasMadeFromSquares([rawFromRankFile(7, 4), rawFromRankFile(7, 7)]);
});

ChessBoard.prototype.__defineGetter__('blackCanCastleQueenside', function () {
  return !this.moveWasMadeFromSquares([rawFromRankFile(7, 4), rawFromRankFile(7, 0)]);
});

// Condition functions

ChessBoard.prototype.moveWasMadeFromSquares = function(squareIndices) {
  return _.any(this.moves, function(move) {
    return _.any(squareIndices, function(squareIndex) {
      return move.sourceIndex == squareIndex;
    });
  });
}

ChessBoard.prototype.isSquareInFileRangeAlongRankThreatened = function(rankIndex, start, end, piece) {
  return _.any(_.range(start, end), function(fileIndex) {
    return this.isSquareThreatened(rankIndex, fileIndex, piece.color*-1);
  }, this);
}

// Non logic functions.

ChessBoard.prototype.horizontalBorder = "+-----------------+"

ChessBoard.prototype.boardString = function() {
  return this.horizontalBorder + _.reduce(_.map(_.range(0, 64, 8), function(index) {
    return _.reduce(
      this.board.slice(64 - (index + 8), 64 - index),
      function(stringThusFar, piece) {
        return stringThusFar + piece.getName() + " ";
      }, " ");
  }.bind(this)), function (stringThusFar, rowString) {
    return stringThusFar + "|" + rowString + "|\n";
  }, "\n") + this.horizontalBorder;
}

ChessBoard.prototype.listen = function(callable) {
  this.listeners.push(callable);
}

ChessBoard.prototype.majorPieceRowForColor = function(color) {
  return [
  	new Rook(color, this),
  	new Knight(color, this),
  	new Bishop(color, this),
  	new Queen(color, this),
  	new King(color, this),
  	new Bishop(color, this),
    new Knight(color, this),
    new Rook(color, this)
  ];
}

// RankFile functions.

ChessBoard.prototype.getLegalMoves = rawToRankFile(
  ChessBoard.prototype.getLegalMovesRaw
);

ChessBoard.prototype.isSquareThreatened = rawToRankFile(
  ChessBoard.prototype.isSquareThreatenedRaw
);

ChessBoard.prototype.getPiece = rawToRankFile(
  ChessBoard.prototype.getPieceRaw
);

ChessBoard.prototype.setPiece = rawToRankFile(
  ChessBoard.prototype.setPieceRaw
);

ChessBoard.prototype.makeMove = rawToRankFileSrcDst(
  ChessBoard.prototype.makeMoveRaw
);

ChessBoard.prototype.getMovesThreatenedByRaw = rankFileToRaw(
  ChessBoard.prototype.getMovesThreatenedBy
);

// DeltaChessBoard

DeltaBoardPrototype = Object.create(ChessBoard.prototype);

DeltaBoardPrototype.resetToParent = function() {
  this.whiteKingPosition = this.parent.getKingPosition(WHITE);
  this.blackKingPosition = this.parent.getKingPosition(BLACK);
  this.deltas = {};
}

DeltaBoardPrototype.getPieceRaw = function (squareIndex) {
  if(this.deltas.hasOwnProperty(squareIndex)) return this.deltas[squareIndex];
  return this.parent.getPieceRaw(squareIndex);
}

DeltaBoardPrototype.getPiece = rawToRankFile(
  DeltaBoardPrototype.getPieceRaw
);

DeltaBoardPrototype.setPieceRaw = function (squareIndex, piece) {
  if(typeof(piece) === 'undefined') piece = EmptySquare;
  this.deltas[squareIndex] = piece;
  if(piece instanceof King) this.setKingPosition(piece.color, squareIndex);
}

DeltaBoardPrototype.setPiece = rawToRankFile(
  DeltaBoardPrototype.setPieceRaw
);

DeltaBoardPrototype.getKingPosition = function(color) {
  return (color == WHITE ? this.whiteKingPosition : this.blackKingPosition)
}

DeltaBoardPrototype.setKingPosition = function(color, squareIndex) {
  if(color == WHITE) {
    this.whiteKingPosition = squareIndex;
  } else {
    this.blackKingPosition = squareIndex;
  }
}

function DeltaChessBoard(parent) {
  this.parent = parent;
  this.resetToParent()
}

DeltaChessBoard.prototype = DeltaBoardPrototype;
