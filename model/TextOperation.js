import isString from '../util/isString'
import isNumber from '../util/isNumber'
import Conflict from './Conflict'

const INSERT = 'insert'
const DELETE = 'delete'

export default class TextOperation {
  constructor (data) {
    if (!data || data.type === undefined || data.pos === undefined || data.str === undefined) {
      throw new Error('Illegal argument: insufficient data.')
    }
    // 'insert' or 'delete'
    this.type = data.type
    // the position where to apply the operation
    this.pos = data.pos
    // the string to delete or insert
    this.str = data.str
    // sanity checks
    if (!this.isInsert() && !this.isDelete()) {
      throw new Error('Illegal type.')
    }
    if (!isString(this.str)) {
      throw new Error('Illegal argument: expecting string.')
    }
    if (!isNumber(this.pos) || this.pos < 0) {
      throw new Error('Illegal argument: expecting positive number as pos.')
    }
  }

  apply (str) {
    if (this.isEmpty()) return str
    if (this.type === INSERT) {
      if (str.length < this.pos) {
        throw new Error('Provided string is too short.')
      }
      if (str.splice) {
        return str.splice(this.pos, 0, this.str)
      } else {
        return str.slice(0, this.pos).concat(this.str).concat(str.slice(this.pos))
      }
    } else /* if (this.type === DELETE) */ {
      if (str.length < this.pos + this.str.length) {
        throw new Error('Provided string is too short.')
      }
      if (str.splice) {
        return str.splice(this.pos, this.str.length)
      } else {
        return str.slice(0, this.pos).concat(str.slice(this.pos + this.str.length))
      }
    }
  }

  clone () {
    return new TextOperation(this)
  }

  isNOP () {
    return this.type === 'NOP' || this.str.length === 0
  }

  isInsert () {
    return this.type === INSERT
  }

  isDelete () {
    return this.type === DELETE
  }

  getLength () {
    return this.str.length
  }

  invert () {
    var data = {
      type: this.isInsert() ? DELETE : INSERT,
      pos: this.pos,
      str: this.str
    }
    return new TextOperation(data)
  }

  hasConflict (other) {
    return _hasConflict(this, other)
  }

  isEmpty () {
    return this.str.length === 0
  }

  toJSON () {
    return {
      type: this.type,
      pos: this.pos,
      str: this.str
    }
  }

  toString () {
    return ['(', (this.isInsert() ? INSERT : DELETE), ',', this.pos, ",'", this.str, "')"].join('')
  }

  // TODO: do we need this anymore?
  get _isOperation () { return true }
  get _isTextOperation () { return true }

  static transform (a, b, options) {
    return transform(a, b, options)
  }

  static hasConflict (a, b) {
    return _hasConflict(a, b)
  }

  // Factories

  static Insert (pos, str) {
    return new TextOperation({ type: INSERT, pos: pos, str: str })
  }

  static Delete (pos, str) {
    return new TextOperation({ type: DELETE, pos: pos, str: str })
  }

  static fromJSON (data) {
    return new TextOperation(data)
  }

  // Symbols
  // TODO: probably just export the symbols
  static get INSERT () { return INSERT }
  static get DELETE () { return DELETE }
}

function _hasConflict (a, b) {
  // Insert vs Insert:
  //
  // Insertions are conflicting iff their insert position is the same.
  if (a.type === INSERT && b.type === INSERT) return (a.pos === b.pos)
  // Delete vs Delete:
  //
  // Deletions are conflicting if their ranges overlap.
  if (a.type === DELETE && b.type === DELETE) {
    // to have no conflict, either `a` should be after `b` or `b` after `a`, otherwise.
    return !(a.pos >= b.pos + b.str.length || b.pos >= a.pos + a.str.length)
  }
  // Delete vs Insert:
  //
  // A deletion and an insertion are conflicting if the insert position is within the deleted range.
  var del, ins
  if (a.type === DELETE) {
    del = a; ins = b
  } else {
    del = b; ins = a
  }
  return (ins.pos >= del.pos && ins.pos < del.pos + del.str.length)
}

// Transforms two Insertions
// --------

function transformInsertInsert (a, b) {
  if (a.pos === b.pos) {
    b.pos += a.str.length
  } else if (a.pos < b.pos) {
    b.pos += a.str.length
  } else {
    a.pos += b.str.length
  }
}

// Transform two Deletions
// --------
//

function transformDeleteDelete (a, b, first) {
  // reduce to a normalized case
  if (a.pos > b.pos) {
    return transformDeleteDelete(b, a, !first)
  }
  if (a.pos === b.pos && a.str.length > b.str.length) {
    return transformDeleteDelete(b, a, !first)
  }
  // take out overlapping parts
  if (b.pos < a.pos + a.str.length) {
    var s = b.pos - a.pos
    var s1 = a.str.length - s
    var s2 = s + b.str.length
    a.str = a.str.slice(0, s) + a.str.slice(s2)
    b.str = b.str.slice(s1)
    b.pos -= s
  } else {
    b.pos -= a.str.length
  }
}

// Transform Insert and Deletion
// --------
//

function transformInsertDelete (a, b) {
  if (a.type === DELETE) {
    return transformInsertDelete(b, a)
  }
  // we can assume, that a is an insertion and b is a deletion
  // a is before b
  if (a.pos <= b.pos) {
    b.pos += a.str.length
  // a is after b
  } else if (a.pos >= b.pos + b.str.length) {
    a.pos -= b.str.length
  // Note: this is a conflict case the user should be noticed about
  // If applied still, the deletion takes precedence
  // a.pos > b.pos && <= b.pos + b.length
  } else {
    var s = a.pos - b.pos
    b.str = b.str.slice(0, s) + a.str + b.str.slice(s)
    a.str = ''
  }
}

function transform (a, b, options) {
  options = options || {}
  if (options['no-conflict'] && _hasConflict(a, b)) {
    throw new Conflict(a, b)
  }
  if (!options.inplace) {
    a = a.clone()
    b = b.clone()
  }
  if (a.type === INSERT && b.type === INSERT) {
    transformInsertInsert(a, b)
  } else if (a.type === DELETE && b.type === DELETE) {
    transformDeleteDelete(a, b, true)
  } else {
    transformInsertDelete(a, b)
  }
  return [a, b]
}
