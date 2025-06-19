require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-native-worker'
  s.version      = package['version']
  s.summary      = package['description']
  s.description  = package['description']
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.authors      = package['author']

  s.platforms    = { :ios => '11.0' }
  s.source       = { :git => package['repository']['url'], :tag => "#{s.version}" }

  s.source_files = '*.{h,m,mm,swift}'
  s.requires_arc = true
  s.swift_version = '5.0'

  s.dependency 'React-Core'
end 