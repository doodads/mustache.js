# mustache.js — Logic-less templates with JavaScript

> What could be more logically awesome than no logic at all?

## What is it?

This project is an implementation fo the mustache template syntax in JavaScript for use in the browser. It is tested and known to work with Internet Explorer 7+, Chrome (any version in the last year), Firefox (4+), and Safari (latest only). While it may work in server side environments such as node.js, it has not been tested.

## Dependencies

A couple of dependencies before the library can be fuilt:

* Node (A versin that includes `npm` by default)
* Jake installed globally (`npm install -g jake`)
* Uglify-JS installed locally (`npm install uglify-js`)
* JSHint installed locally (`npm install jshint`)

Once these dependencies are installed, you can "build" the library by running:

	jake

## Usage

This implementation of Mustache is fully spec complaint, so look at the 
[specification](https://github.com/mustache/spec) for usage details. In addition, there is a set of [documentation
wiki pages](https://github.com/doodads/mustache.js/wiki/Documentation) outlining examples for how to use this implementation.