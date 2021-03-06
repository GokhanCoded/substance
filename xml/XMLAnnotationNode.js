import AnnotationMixin from '../model/AnnotationMixin'
import XMLDocumentNode from './XMLDocumentNode'

export default class XMLAnnotationNode extends AnnotationMixin(XMLDocumentNode) {
  /*
    The parent of an Annotation is implicitly given by its path.
  */
  get parentNode () {
    const path = this.start.path
    const doc = this.getDocument()
    return doc.get(path[0])
  }

  static isPropertyAnnotation () { return true }

  get _elementType () { return 'annotation' }
}

// schema inherited from mixin
XMLAnnotationNode.schema = {
  type: '@annotation'
}
