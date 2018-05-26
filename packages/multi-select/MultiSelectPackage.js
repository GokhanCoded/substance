import MultiSelect from './MultiSelect'

export default {
  name: 'multi-select',
  configure: function (config) {
    config.addComponent('multi-select', MultiSelect)
    config.addIcon('selected-option', { 'fontawesome': 'fa-check-square' })
    config.addIcon('unselected-option', { 'fontawesome': 'fa-square' })
    config.addLabel('expand-options', {
      en: 'Show more',
      de: 'Zeig mehr'
    })
    config.addLabel('collapse-options', {
      en: 'Show less',
      de: 'Zeige weniger'
    })
  }
}
