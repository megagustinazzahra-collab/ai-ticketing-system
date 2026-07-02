'use strict'

module.exports = {
  spec: 'test/**/*.test.js',
  file: ['test/setup.js'],
  timeout: 15000,
  exit: true,
  reporter: 'mochawesome',
  reporterOptions: 'reportDir=mochawesome-report,overwrite=true,html=true,json=true',
}
