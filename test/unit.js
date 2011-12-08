test("Argument validation", function() {
	equals(Mustache.to_html(undefined), '', 'No parameters');
	equals(Mustache.to_html('{{hi}}'), '', ' No View or Partials');
	equals(Mustache.to_html('{{hi}}', {hi:'Hi.'}), 'Hi.', 'No Partials');
	equals(Mustache.to_html('{{>hi}}', undefined, {hi:'{{p}}'}), '', 'Partial but no view');
});

test("Parser", function() {
	// matches whitespace_partial.html
	equals(
		Mustache.to_html(
			'<h1>{{  greeting  }}</h1>\n{{#partial}}{{> partial }}{{/partial}}\n<h3>{{ farewell }}</h3>',
			{
				greeting: function() {
					return "Welcome";
				},

				farewell: function() {
					return "Fair enough, right?";
				},

				partial: {
					name: "Chris",
					value: 10000,
					taxed_value: function() {
						return this.value - (this.value * 0.4);
					},
					in_ca: true
				}
			},
			{partial:'Hello {{ name}}\nYou have just won ${{value }}!\n{{# in_ca  }}\nWell, ${{ taxed_value }}, after taxes.\n{{/  in_ca }}\n'}
		),
		'<h1>Welcome</h1>\nHello Chris\nYou have just won $10000!\n\nWell, $6000, after taxes.\n\n\n<h3>Fair enough, right?</h3>',
		'Whitespace in Tag names'
	);
	
	equals(
		Mustache.to_html(
			'{{tag1}}\n\n\n{{tag2}}\n',
			{ tag1: 'Hello', tag2: 'World' },
			{}
		),
		'Hello\n\n\nWorld\n',
		'Preservation of white space'
	);

	raises(
		function() {
			Mustache.to_html(
				'{{=tag1}}',
				{ tag1: 'Hello' },
				{}
			);
		}, function(e) {
			return e instanceof Mustache.Error && e.message === '(1,1): Malformed change delimiter token "{{=tag1}}".';
		},
		'Malformed tags should be handled correctly.'
	);
	
	raises(
		function() {
			Mustache.to_html(
				'{{tag blah}}'
			)	
		}, function(e) {
			return e.message === '(1,1): Malformed variable name "tag blah".';
		},
		'Malformed tags should be handled correctly.'
	);	
	
	var partials = { 'partial' : '{{key}}' };
	Mustache.compile('{{>partial}}', partials );
	
	equals(partials['partial'], '{{key}}', 'Partials compiler must be non-destructive');
});

test("Basic Variables", function() {
	// matches escaped.html
	equals(
		Mustache.to_html(
			'<h1>{{title}}</h1>\nBut not {{entities}}.\n',
			{
				title: function() {
					return "Bear > Shark";
				},
				entities: "&quot;"
			},
			{}
		),
		'<h1>Bear &gt; Shark</h1>\nBut not &amp;quot;.\n',
		'HTML Escaping'
	);
		
	// matches apostrophe.html (except in this implementation, apostrophes are not escaped.
	equals(
		Mustache.to_html(
			'{{apos}}{{control}}',
			{ apos: '\'', control: 'X' },
			{}
		),
		'\'X',
		'Apostrophe escaping'
	);
	
	// matches null_string.html
	equals(
		Mustache.to_html(
			'Hello {{name}}\nglytch {{glytch}}\nbinary {{binary}}\nvalue {{value}}\nnumeric {{numeric}}',
			{
				name: "Elise",
				glytch: true,
				binary: false,
				value: null,
				numeric: function() {
					return NaN;
				}
			},
			{}
		),
		'Hello Elise\nglytch true\nbinary false\nvalue \nnumeric NaN',
		'Different variable types'
	);
	
	// matches two_in_a_row.html
	equals(
		Mustache.to_html(
			'{{greeting}}, {{name}}!',
			{
				name: "Joe",
				greeting: "Welcome"
			},
			{}
		),
		'Welcome, Joe!'
	);
	
});

test("Dot Notation", function() {
	equals(
		Mustache.to_html(
			'{{a.b.c}}',
			{ a: { b: { c: 0 } } },
			{}
		),
		'0'
	);

	equals(
		Mustache.to_html(
			'{{a.b.c}}',
			{ a: { b: {} } },
			{}
		),
		''
	);

	equals(
		Mustache.to_html(
			'{{a.b.c}}',
			{ a: { b: 0 } },
			{}
		),
		''
	);

	equals(
		Mustache.to_html(
			'{{a.b.c}}',
			{ a: { b: function() { return { c: 5 } } } },
			{}
		),
		'5'
	);	

	equals(
		Mustache.to_html(
			'{{#a.b.c}}{{d}}{{/a.b.c}}',
			{ a: { b: function() { return { c: [ {d: 'a'}, {d: 'b'}, {d: 'c'} ] } } } },
			{}
		),
		'abc'
	);	
});


test("'{' or '&' (Unescaped Variable)", function() {
	// matches unescaped.html
	equals(
		Mustache.to_html(
			'<h1>{{{title}}}</h1>',
			{
				title: function() {
					return "Bear > Shark";
				}
			},
			{}
		),
		'<h1>Bear > Shark</h1>',
		'{ character'
	);
	
	equals(
		Mustache.to_html(
			'<h1>{{&title}}</h1>',
			{
				title: function() {
					return "Bear > Shark";
				}
			},
			{}
		),
		'<h1>Bear > Shark</h1>',
		'& character'
	);
	
	equals(
		Mustache.to_html(
			'<h1>{{title}}}</h1>',
			{ title: 'Bear > Shark' }
			, {}
		),
		'<h1>Bear &gt; Shark}</h1>'
		, 'Potential false positive'
	);
});

test("'#' (Sections)", function() {
	// matches array_of_partials_implicit_partial.html
	equals(
		Mustache.to_html(
			'Here is some stuff!\n{{#numbers}}\n{{>partial}}\n{{/numbers}}',
			{ numbers: ['1', '2', '3', '4'] },
			{ partial: '{{.}}' }
		),
		'Here is some stuff!\n\n1\n\n2\n\n3\n\n4\n',
		'Array of Partials (Implicit)'
	);
	
	// matches array_of_partials_partial.html
	equals(
		Mustache.to_html(
			'Here is some stuff!\n{{#numbers}}\n{{>partial}}\n{{/numbers}}',
			{ numbers: [{i: '1'}, {i: '2'}, {i: '3'}, {i: '4'}] },
			{ partial: '{{i}}' }
		),
		'Here is some stuff!\n\n1\n\n2\n\n3\n\n4\n',
		'Array of Partials (Explicit)'
	);
	
	// matches array_of_strings.html
	equals(
		Mustache.to_html(
			'{{#array_of_strings}}{{.}} {{/array_of_strings}}',
			{array_of_strings: ['hello', 'world']},
			{}
		),
		'hello world ',
		'Array of Strings'
	);
	
	// mathces higher_order_sections.html
	equals(
		Mustache.to_html(
			'{{#bolder}}Hi {{name}}.{{/bolder}}\n',
			{
				"name": "Tater",
				"helper": "To tinker?",
				"bolder": function() {
					return function(text, render) {
						return "<b>" + render(text) + '</b> ' + this.helper;
					}
				}
			},
			{}
		),
		'<b>Hi Tater.</b> To tinker?\n'
	);
	
	// matches recursion_with_same_names.html
	equals(
		Mustache.to_html(
			'{{ name }}\n{{ description }}\n\n{{#terms}}\n  {{name}}\n  {{index}}\n{{/terms}}\n',
			{
				name: 'name',
				description: 'desc',
				terms: [
					{name: 't1', index: 0},
					{name: 't2', index: 1}
				]
			},
			{}
		),
		'name\ndesc\n\n\n  t1\n  0\n\n  t2\n  1\n\n'
	);
	
	// matches reuse_of_enumerables.html
	equals(
		Mustache.to_html(
			'{{#terms}}\n  {{name}}\n  {{index}}\n{{/terms}}\n{{#terms}}\n  {{name}}\n  {{index}}\n{{/terms}}\n',
			{
				terms: [
					{name: 't1', index: 0},
					{name: 't2', index: 1}
				]
			},
			{}
		),
		'\n  t1\n  0\n\n  t2\n  1\n\n\n  t1\n  0\n\n  t2\n  1\n\n',
		'Lazy match of Section and Inverted Section'
	);
	
	// matches section_as_context.html
	equals(
		Mustache.to_html(
			'{{#a_object}}\n  <h1>{{title}}</h1>\n  <p>{{description}}</p>\n  <ul>\n    {{#a_list}}\n    <li>{{label}}</li>\n    {{/a_list}}\n  </ul>\n{{/a_object}}\n',
			{
				a_object: {
					title: 'this is an object',
					description: 'one of its attributes is a list',
					a_list: [{label: 'listitem1'}, {label: 'listitem2'}]
				}
			},
			{}
		),
		'\n  <h1>this is an object</h1>\n  <p>one of its attributes is a list</p>\n  <ul>\n    \n    <li>listitem1</li>\n    \n    <li>listitem2</li>\n    \n  </ul>\n\n',
		'Lazy match of Section and Inverted Section'
	);
	
	// matches nesting.html
	equals(
		Mustache.to_html(
			'{{#foo}}\n  {{#a}}\n    {{b}}\n  {{/a}}\n{{/foo}}',
			{
				foo: [
					{a: {b: 1}},
					{a: {b: 2}},
					{a: {b: 3}}
				]
			},
			{}
		),
		'\n  \n    1\n  \n\n  \n    2\n  \n\n  \n    3\n  \n',
		'Context Nesting'
	);
});

test("'^' (Inverted Section)", function() {
	// matches inverted_section.html
	equals(
		Mustache.to_html(
			'{{#repo}}<b>{{name}}</b>{{/repo}}\n{{^repo}}No repos :({{/repo}}\n',
			{
				"repo": []
			},
			{}
		),
		'\nNo repos :(\n'
	);
});

test("'>' (Partials)", function() {
	// matches view_partial.html
	equals(
		Mustache.to_html(
			'<h1>{{greeting}}</h1>\n{{#partial}}{{>partial}}{{/partial}}\n<h3>{{farewell}}</h3>',
			{
				greeting: function() {
					return "Welcome";
				},
				
				farewell: function() {
					return "Fair enough, right?";
				},
				
				partial: {
					name: "Chris",
					value: 10000,
					taxed_value: function() {
						return this.value - (this.value * 0.4);
					},
					in_ca: true
				}
			},
			{partial: 'Hello {{name}}\nYou have just won ${{value}}!\n{{#in_ca}}\nWell, ${{ taxed_value }}, after taxes.\n{{/in_ca}}\n'}
		),
		'<h1>Welcome</h1>\nHello Chris\nYou have just won $10000!\n\nWell, $6000, after taxes.\n\n\n<h3>Fair enough, right?</h3>'
	);
	
	// matches array_partial.html
	equals(
		Mustache.to_html(
			'{{>partial}}',
			{ 
				array: ['1', '2', '3', '4']
			},
			{ partial: 'Here\'s a non-sense array of values\n{{#array}}\n  {{.}}\n{{/array}}' }
		),
		'Here\'s a non-sense array of values\n\n  1\n\n  2\n\n  3\n\n  4\n'
	);
	
	// matches template_partial.html
	equals(
		Mustache.to_html(
			'<h1>{{title}}</h1>\n{{>partial}}',
			{
				title: function() {
					return "Welcome";
				},
				again: "Goodbye"
			},
			{partial:'Again, {{again}}!'}
		),
		'<h1>Welcome</h1>\nAgain, Goodbye!'
	);
	
	// matches partial_recursion.html
	equals(
		Mustache.to_html(
			'{{name}}\n{{#kids}}\n{{>partial}}\n{{/kids}}',
			{
				name: '1',
				kids: [
					{
						name: '1.1',
						children: [
							{name: '1.1.1'}
						]
					}
				]
			},
			{partial:'{{name}}\n{{#children}}\n{{>partial}}\n{{/children}}'}
		),
		'1\n\n1.1\n\n1.1.1\n\n\n'
	);
	
	raises(
		function() {
			Mustache.to_html(
				'{{>partial}}',
				{},
				{partal: ''}
			);
		}, function(e) {
			return e.message === '(1,1): Unknown partial "partial".';
		},
		'Missing partials should be handled correctly.'
	);
});

test("'=' (Set Delimiter)", function() {
	// matches delimiter.html
	equals(
		Mustache.to_html(
			'{{=<% %>=}}*\n<% first %>\n* <% second %>\n<%=| |=%>\n* | third |\n|={{ }}=|\n* {{ fourth }}',
			{
				first: "It worked the first time.",
				second: "And it worked the second time.",
				third: "Then, surprisingly, it worked the third time.",
				fourth: "Fourth time also fine!."
			},
			{}
		),
		'*\nIt worked the first time.\n* And it worked the second time.\n\n* Then, surprisingly, it worked the third time.\n\n* Fourth time also fine!.',
		'Simple Set Delimiter'
	);
		
	equals(
		Mustache.to_html(
			'{{#noData}}{{=~~ ~~=}}Set Change Delimiter ~~data~~ ~~={{ }}=~~{{/noData}}'
			, {
				noData: true
				, data: false
			}
			, {}
		)
		, 'Set Change Delimiter false '
		, 'Change Delimiter inside Section');	
});

test("'!' (Comments)", function() {
	equals(
		Mustache.to_html('{{! this is a single line comment !}}'),
		'',
		'Single Line Comments');

	equals(
		Mustache.to_html('{{!this is a multiline comment\ni said this is a multiline comment!}}'),
		'',
		'Multiline Comments');
			
	equals(
		Mustache.to_html('{{!this {{is}} {{#a}} {{/multiline}} comment\ni {{^said}} ! hello !! bye!}}'),
		'',
		'Correct tokenization');

	// matches comments.html
	equals(
		Mustache.to_html(
			'<h1>{{title}}{{! just something interesting... or not... !}}</h1>\n',
			{
				title: function() {
					return "A Comedy of Errors";
				}
			},
			{}
		),
		'<h1>A Comedy of Errors</h1>\n'
	);
});

test("'%' (Pragmas)", function() {
	// matches array_of_strings_options.html
	equals(
		Mustache.to_html(
			'{{%IMPLICIT-ITERATOR iterator=rob}}\n{{#array_of_strings_options}}{{rob}} {{/array_of_strings_options}}',
			{array_of_strings_options: ['hello', 'world']},
			{}
		),
		'\nhello world ',
		'IMPLICIT-ITERATOR pragma'
	);
	
	// matches unknown_pragma.txt
	
	raises(
		function() {
			Mustache.to_html(
				'{{%I-HAVE-THE-GREATEST-MUSTACHE}}\n',
				{},
				{}
			);
		},
		function(e) {
			return e.message === 'This implementation of mustache does not implement the "I-HAVE-THE-GREATEST-MUSTACHE" pragma.';
		},
		'Notification of unimplemented pragmas'
	);
	
	equals(
		Mustache.to_html(
			'{{%IMPLICIT-ITERATOR}}{{#dataSet}}{{.}}:{{/dataSet}}',
			{ dataSet: [ 'Object 1', 'Object 2', 'Object 3' ] },
			{}
		),
		"Object 1:Object 2:Object 3:",
		'Default behaviour for IMPLICIT ITERATOR'
	);
	
	equals(
		Mustache.to_html(
			'{{=<% %>=}}{{%IMPLICIT-ITERATOR iterator=rob}}<%#dataSet%><%rob%>:<%/dataSet%>',
			{ dataSet: [ 'Object 1', 'Object 2', 'Object 3' ] },
			{}
		),
		"Object 1:Object 2:Object 3:",
		'Change Delimiter and Pragma mixes'
	);


	raises(
		function() {
			Mustache.to_html(
				'{{%IMPLICIT-ITERATOR iterator=rob}}{{%I-HAVE-THE-GREATEST-MUSTACHE}}',
				{},
				{}
			);
		},
		function(e) {
			return e.message === 'This implementation of mustache does not implement the "I-HAVE-THE-GREATEST-MUSTACHE" pragma.';
		},
		'Multiple Pragmas'
	);	
});

test("Empty", function() {
	// matches empty_template.html
	equals(
		Mustache.to_html(
			'<html><head></head><body><h1>Test</h1></body></html>',
			{},
			{}
		),
		'<html><head></head><body><h1>Test</h1></body></html>',
		'Empty Template'
	);
	
	// matches empty_partial.html
	equals(
		Mustache.to_html(
			'hey {{foo}}\n{{>partial}}\n',
			{
				foo: 1
			},
			{partial: 'yo'}
		),
		'hey 1\nyo\n',
		'Empty Partial'
	);
});

test("Demo", function() {
	// matches simple.html
	equals(
		Mustache.to_html(
			'Hello {{name}}\nYou have just won ${{value}}!\n{{#in_ca}}\nWell, ${{ taxed_value }}, after taxes.\n{{/in_ca}}',
			{
				name: "Chris",
				value: 10000,
				taxed_value: function() {
					return this.value - (this.value * 0.4);
				},
				in_ca: true
			},
			{}
		),
		'Hello Chris\nYou have just won $10000!\n\nWell, $6000, after taxes.\n',
		'A simple template'
	);
	
	// matches complex.html
	var template = [
		'<h1>{{header}}</h1>',
		'{{#list}}',
		'  <ul>',
		'  {{#item}}',
		'  {{#current}}',
		'      <li><strong>{{name}}</strong></li>',
		'  {{/current}}',
		'  {{#link}}',
		'      <li><a href="{{url}}">{{name}}</a></li>',
		'  {{/link}}',
		'  {{/item}}',
		'  </ul>',
		'{{/list}}',
		'{{#empty}}',
		'  <p>The list is empty.</p>',
		'{{/empty}}'
	].join('\n');
	
	var view = {
		header: function() {
			return "Colors";
		},
		item: [
			{name: "red", current: true, url: "#Red"},
			{name: "green", current: false, url: "#Green"},
			{name: "blue", current: false, url: "#Blue"}
		],
		link: function() {
			return this["current"] !== true;
		},
		list: function() {
			return this.item.length !== 0;
		},
		empty: function() {
			return this.item.length === 0;
		}
	};
	
	var expected_result = '<h1>Colors</h1>\n\n  <ul>\n  \n  \n      <li><strong>red</strong></li>\n  \n  \n      <li><a href=\"#Red\">red</a></li>\n  \n  \n  \n  \n      <li><a href=\"#Green\">green</a></li>\n  \n  \n  \n  \n      <li><a href=\"#Blue\">blue</a></li>\n  \n  \n  </ul>\n\n';
	
	equals(
		Mustache.to_html(
			template,
			view,
			{}
		),
		expected_result,
		'A complex template'
	);
});

test("Error Handling", function() {
	raises(
		function() {
			Mustache.to_html(
				'this is a partial\nyes it is. {{>partial}}',
				{},
				{partal: ''}
			);
		}, function(e) {
			return e.line === 2 && e.character === 12;
		},
		'Missing partial line and character correctness.'
	);
	
	raises(
		function() {
			Mustache.to_html(
				'this is a partial\nyes it is. {{>partial}}',
				{},
				{partial: 'error in {{#foobar}}'}
			);
		}, function(e) {
			return e.message === '[partial](1,21): Closing section tag "foobar" expected.'
		},
		'Unbalanced section correctness (Part 1).'
	);
	
	raises(
		function() {
			Mustache.to_html(
				'something something something {{/darkside}}.',
				{},
				{}
			);
		}, function(e) {
			return e.message === '(1,31): Unbalanced End Section tag "{{/darkside}}".'
		},
		'Unbalanced section correctness (Part 2).'
	);

	raises(
		function() {
			Mustache.to_html(
				'this is a partial\nyes it is. {{>maria}}',
				{},
				{maria: 'error in {{#foobar}}this is the most aw\ns\nme think {{#evar}}hello joe{{/foobar}}{{/evar}}'}
			);
		}, function(e) {
			return e.message === '[maria](3,28): Unexpected section end tag "foobar", expected "evar".'
		},
		'Partials metric correctness.'
	);
});

test("Regression Suite", function() {
	// matches bug_11_eating_whitespace.html
	equals(
		Mustache.to_html(
			'{{tag}} foo',
			{ tag: "yo" },
			{}
		),
		'yo foo',
		'Issue 11'
	);
	
	// matches delimiters_partial.html
	equals(
		Mustache.to_html(
			'{{#enumerate}}\n{{>partial}}\n{{/enumerate}}',
			{ enumerate: [ { text: 'A' }, { text: 'B' } ] },
			{ partial: '{{=[[ ]]=}}\n{{text}}\n[[={{ }}=]]' }
		),
		'\n\n{{text}}\n\n\n\n{{text}}\n\n',
		'Issue 44'
	);
	
	// matches bug_46_set_delimiter.html
	equals(
		Mustache.to_html(
			'{{=[[ ]]=}}[[#IsMustacheAwesome]]mustache is awesome![[/IsMustacheAwesome]]', 
			{IsMustacheAwesome: true}, 
			{}
		),
		'mustache is awesome!',
		'Issue 46'
	);
	
	// matches Issue #79
	equals(
		Mustache.to_html(
			'{{#inner}}{{f}}{{#inner}}{{b}}{{/inner}}{{/inner}}'
			, {
				inner: [{
					f: 'foo'
					, inner: [{
						b: 'bar'
					}]
				}]
			}
			, {}
		)
		, 'foobar'
		, 'Nested Sections with the same name'
	);
	
	equals(
		Mustache.to_html(
			'{{=~~ ~~=}} ~~>staticInfoPanel~~ ~~={{ }}=~~'
			, {}
			, { staticInfoPanel: 'Hello' }
		)
		, ' Hello '
		, 'Change Delimiter + Partial');
		
	// matches Issue #141
	equals(
		Mustache.to_html("You said '{{{html}}}' today", { html: "I like {{mustache}}" })
		, "You said 'I like {{mustache}}' today"
		, 'No recursive parsing');
});

test("Mustache.format", function() {
	equals(
		Mustache.format('{{0}} {{1}}, {{2}} {{3}}.', 'And', 'it', 'was', 'good'),
		'And it, was good.',
		'Simple Version'
	);
	
	equals(
		Mustache.format('{{0}}', function() { return 'Groucho Marx'; } ),
		'Groucho Marx',
		'With Functions'
	);
	
	equals(
		Mustache.format('{{0}}'),
		'',
		'Insufficient parameters (no failure)'
	);
});

function spec_tests(json) {
	for (var i=0,n=json.tests.length;i<n;++i) {
		equals(Mustache.to_html(json.tests[i].template, json.tests[i].data, json.tests[i].partials || {}), json.tests[i].expected, json.tests[i].name + ' (' + json.tests[i].desc + ')');
	}
}

test("Spec - Comments", function() {
	spec_tests({
		"__ATTN__":"Do not edit this file; changes belong in the appropriate YAML file.",
		"overview":"Comment tags represent content that should never appear in the resulting\noutput.\n\nThe tag's content may contain any substring (including newlines) EXCEPT the\nclosing delimiter.\n\nComment tags SHOULD be treated as standalone when appropriate.\n",
		"tests":[
			{"name":"Inline","data":{},"expected":"1234567890","template":"12345{{! Comment Block! !}}67890","desc":"Comment blocks should be removed from the template."},
			{"name":"Multiline","data":{},"expected":"1234567890\n","template":"12345{{!\n  This is a\n  multi-line comment...\n!}}67890\n","desc":"Multiline comments should be permitted."},
			{"name":"Standalone","data":{},"expected":"Begin.\nEnd.\n","template":"Begin.\n{{! Comment Block! !}}\nEnd.\n","desc":"All standalone comment lines should be removed."},
			{"name":"Indented Standalone","data":{},"expected":"Begin.\nEnd.\n","template":"Begin.\n  {{! Indented Comment Block! !}}\nEnd.\n","desc":"All standalone comment lines should be removed."},
			{"name":"Standalone Line Endings","data":{},"expected":"|\r\n|","template":"|\r\n{{! Standalone Comment !}}\r\n|","desc":"\"\\r\\n\" should be considered a newline for standalone tags."},
			{"name":"Standalone Without Previous Line","data":{},"expected":"!","template":"  {{! I'm Still Standalone !}}\n!","desc":"Standalone tags should not require a newline to precede them."},
			{"name":"Standalone Without Newline","data":{},"expected":"!\n","template":"!\n  {{! I'm Still Standalone !}}","desc":"Standalone tags should not require a newline to follow them."},
			{"name":"Multiline Standalone","data":{},"expected":"Begin.\nEnd.\n","template":"Begin.\n{{!\nSomething's going on here...\n!}}\nEnd.\n","desc":"All standalone comment lines should be removed."},
			{"name":"Indented Multiline Standalone","data":{},"expected":"Begin.\nEnd.\n","template":"Begin.\n  {{!\n    Something's going on here...\n  !}}\nEnd.\n","desc":"All standalone comment lines should be removed."},
			{"name":"Indented Inline","data":{},"expected":"  12 \n","template":"  12 {{! 34 !}}\n","desc":"Inline comments should not strip whitespace"},
			{"name":"Surrounding Whitespace","data":{},"expected":"12345  67890","template":"12345 {{! Comment Block! !}} 67890","desc":"Comment removal should preserve surrounding whitespace."}
		]
	});
});

test("Spec - Interpolation", function() {
	spec_tests({
		"__ATTN__":"Do not edit this file; changes belong in the appropriate YAML file.",
		"overview":"Interpolation tags are used to integrate dynamic content into the template.\n\nThe tag's content MUST be a non-whitespace character sequence NOT containing\nthe current closing delimiter.\n\nThis tag's content names the data to replace the tag.  A single period (`.`)\nindicates that the item currently sitting atop the context stack should be\nused; otherwise, name resolution is as follows:\n  1) Split the name on periods; the first part is the name to resolve, any\n  remaining parts should be retained.\n  2) Walk the context stack from top to bottom, finding the first context\n  that is a) a hash containing the name as a key OR b) an object responding\n  to a method with the given name.\n  3) If the context is a hash, the data is the value associated with the\n  name.\n  4) If the context is an object, the data is the value returned by the\n  method with the given name.\n  5) If any name parts were retained in step 1, each should be resolved\n  against a context stack containing only the result from the former\n  resolution.  If any part fails resolution, the result should be considered\n  falsey, and should interpolate as the empty string.\nData should be coerced into a string (and escaped, if appropriate) before\ninterpolation.\n\nThe Interpolation tags MUST NOT be treated as standalone.\n",
		"tests":[
			{"name":"No Interpolation","data":{},"expected":"Hello from {Mustache}!\n","template":"Hello from {Mustache}!\n","desc":"Mustache-free templates should render as-is."},
			{"name":"Basic Interpolation","data":{"subject":"world"},"expected":"Hello, world!\n","template":"Hello, {{subject}}!\n","desc":"Unadorned tags should interpolate content into the template."},
			{"name":"HTML Escaping","data":{"forbidden":"& \" < >"},"expected":"These characters should be HTML escaped: &amp; &quot; &lt; &gt;\n","template":"These characters should be HTML escaped: {{forbidden}}\n","desc":"Basic interpolation should be HTML escaped."},
			{"name":"Triple Mustache","data":{"forbidden":"& \" < >"},"expected":"These characters should not be HTML escaped: & \" < >\n","template":"These characters should not be HTML escaped: {{{forbidden}}}\n","desc":"Triple mustaches should interpolate without HTML escaping."},
			{"name":"Ampersand","data":{"forbidden":"& \" < >"},"expected":"These characters should not be HTML escaped: & \" < >\n","template":"These characters should not be HTML escaped: {{&forbidden}}\n","desc":"Ampersand should interpolate without HTML escaping."},
			{"name":"Basic Integer Interpolation","data":{"mph":85},"expected":"\"85 miles an hour!\"","template":"\"{{mph}} miles an hour!\"","desc":"Integers should interpolate seamlessly."},
			{"name":"Triple Mustache Integer Interpolation","data":{"mph":85},"expected":"\"85 miles an hour!\"","template":"\"{{{mph}}} miles an hour!\"","desc":"Integers should interpolate seamlessly."},
			{"name":"Ampersand Integer Interpolation","data":{"mph":85},"expected":"\"85 miles an hour!\"","template":"\"{{&mph}} miles an hour!\"","desc":"Integers should interpolate seamlessly."},
			{"name":"Basic Decimal Interpolation","data":{"power":1.21},"expected":"\"1.21 jiggawatts!\"","template":"\"{{power}} jiggawatts!\"","desc":"Decimals should interpolate seamlessly with proper significance."},
			{"name":"Triple Mustache Decimal Interpolation","data":{"power":1.21},"expected":"\"1.21 jiggawatts!\"","template":"\"{{{power}}} jiggawatts!\"","desc":"Decimals should interpolate seamlessly with proper significance."},
			{"name":"Ampersand Decimal Interpolation","data":{"power":1.21},"expected":"\"1.21 jiggawatts!\"","template":"\"{{&power}} jiggawatts!\"","desc":"Decimals should interpolate seamlessly with proper significance."},
			{"name":"Basic Context Miss Interpolation","data":{},"expected":"I () be seen!","template":"I ({{cannot}}) be seen!","desc":"Failed context lookups should default to empty strings."},
			{"name":"Triple Mustache Context Miss Interpolation","data":{},"expected":"I () be seen!","template":"I ({{{cannot}}}) be seen!","desc":"Failed context lookups should default to empty strings."},
			{"name":"Ampersand Context Miss Interpolation","data":{},"expected":"I () be seen!","template":"I ({{&cannot}}) be seen!","desc":"Failed context lookups should default to empty strings."},
			{"name":"Dotted Names - Basic Interpolation","data":{"person":{"name":"Joe"}},"expected":"\"Joe\" == \"Joe\"","template":"\"{{person.name}}\" == \"{{#person}}{{name}}{{/person}}\"","desc":"Dotted names should be considered a form of shorthand for sections."},
			{"name":"Dotted Names - Triple Mustache Interpolation","data":{"person":{"name":"Joe"}},"expected":"\"Joe\" == \"Joe\"","template":"\"{{{person.name}}}\" == \"{{#person}}{{{name}}}{{/person}}\"","desc":"Dotted names should be considered a form of shorthand for sections."},
			{"name":"Dotted Names - Ampersand Interpolation","data":{"person":{"name":"Joe"}},"expected":"\"Joe\" == \"Joe\"","template":"\"{{&person.name}}\" == \"{{#person}}{{&name}}{{/person}}\"","desc":"Dotted names should be considered a form of shorthand for sections."},
			{"name":"Dotted Names - Arbitrary Depth","data":{"a":{"b":{"c":{"d":{"e":{"name":"Phil"}}}}}},"expected":"\"Phil\" == \"Phil\"","template":"\"{{a.b.c.d.e.name}}\" == \"Phil\"","desc":"Dotted names should be functional to any level of nesting."},
			{"name":"Dotted Names - Broken Chains","data":{"a":{}},"expected":"\"\" == \"\"","template":"\"{{a.b.c}}\" == \"\"","desc":"Any falsey value prior to the last part of the name should yield ''."},
			{"name":"Dotted Names - Broken Chain Resolution","data":{"a":{"b":{}},"c":{"name":"Jim"}},"expected":"\"\" == \"\"","template":"\"{{a.b.c.name}}\" == \"\"","desc":"Each part of a dotted name should resolve only against its parent."},
			{"name":"Dotted Names - Initial Resolution","data":{"a":{"b":{"c":{"d":{"e":{"name":"Phil"}}}}},"b":{"c":{"d":{"e":{"name":"Wrong"}}}}},"expected":"\"Phil\" == \"Phil\"","template":"\"{{#a}}{{b.c.d.e.name}}{{/a}}\" == \"Phil\"","desc":"The first part of a dotted name should resolve as any other name."},
			{"name":"Interpolation - Surrounding Whitespace","data":{"string":"---"},"expected":"| --- |","template":"| {{string}} |","desc":"Interpolation should not alter surrounding whitespace."},
			{"name":"Triple Mustache - Surrounding Whitespace","data":{"string":"---"},"expected":"| --- |","template":"| {{{string}}} |","desc":"Interpolation should not alter surrounding whitespace."},
			{"name":"Ampersand - Surrounding Whitespace","data":{"string":"---"},"expected":"| --- |","template":"| {{&string}} |","desc":"Interpolation should not alter surrounding whitespace."},
			{"name":"Interpolation - Standalone","data":{"string":"---"},"expected":"  ---\n","template":"  {{string}}\n","desc":"Standalone interpolation should not alter surrounding whitespace."},
			{"name":"Triple Mustache - Standalone","data":{"string":"---"},"expected":"  ---\n","template":"  {{{string}}}\n","desc":"Standalone interpolation should not alter surrounding whitespace."},
			{"name":"Ampersand - Standalone","data":{"string":"---"},"expected":"  ---\n","template":"  {{&string}}\n","desc":"Standalone interpolation should not alter surrounding whitespace."},
			{"name":"Interpolation With Padding","data":{"string":"---"},"expected":"|---|","template":"|{{ string }}|","desc":"Superfluous in-tag whitespace should be ignored."},
			{"name":"Triple Mustache With Padding","data":{"string":"---"},"expected":"|---|","template":"|{{{ string }}}|","desc":"Superfluous in-tag whitespace should be ignored."},
			{"name":"Ampersand With Padding","data":{"string":"---"},"expected":"|---|","template":"|{{& string }}|","desc":"Superfluous in-tag whitespace should be ignored."}
		]
	});
});

test("Spec - Partials", function() {
	spec_tests({
		"__ATTN__":"Do not edit this file; changes belong in the appropriate YAML file.",
		"overview":"Partial tags are used to expand an external template into the current\ntemplate.\n\nThe tag's content MUST be a non-whitespace character sequence NOT containing\nthe current closing delimiter.\n\nThis tag's content names the partial to inject.  Set Delimiter tags MUST NOT\naffect the parsing of a partial.  The partial MUST be rendered against the\ncontext stack local to the tag.  If the named partial cannot be found, the\nempty string SHOULD be used instead, as in interpolations.\n\nPartial tags SHOULD be treated as standalone when appropriate.  If this tag\nis used standalone, any whitespace preceding the tag should treated as\nindentation, and prepended to each line of the partial before rendering.\n",
		"tests":[
			{"name":"Basic Behavior","data":{},"expected":"\"from partial\"","template":"\"{{>text}}\"","desc":"The greater-than operator should expand to the named partial.","partials":{"text":"from partial"}},
			{"name":"Failed Lookup","data":{},"expected":"\"\"","template":"\"{{>text}}\"","desc":"The empty string should be used when the named partial is not found.","partials":{}},
			{"name":"Context","data":{"text":"content"},"expected":"\"*content*\"","template":"\"{{>partial}}\"","desc":"The greater-than operator should operate within the current context.","partials":{"partial":"*{{text}}*"}},
			{"name":"Recursion","data":{"content":"X","nodes":[{"content":"Y","nodes":[]}]},"expected":"X<Y<>>","template":"{{>node}}","desc":"The greater-than operator should properly recurse.","partials":{"node":"{{content}}<{{#nodes}}{{>node}}{{/nodes}}>"}},
			{"name":"Surrounding Whitespace","data":{},"expected":"| \t|\t |","template":"| {{>partial}} |","desc":"The greater-than operator should not alter surrounding whitespace.","partials":{"partial":"\t|\t"}},
			{"name":"Inline Indentation","data":{"data":"|"},"expected":"  |  >\n>\n","template":"  {{data}}  {{> partial}}\n","desc":"Whitespace should be left untouched.","partials":{"partial":">\n>"}},
			{"name":"Standalone Line Endings","data":{},"expected":"|\r\n>|","template":"|\r\n{{>partial}}\r\n|","desc":"\"\\r\\n\" should be considered a newline for standalone tags.","partials":{"partial":">"}},
			{"name":"Standalone Without Previous Line","data":{},"expected":"  >\n  >>","template":"  {{>partial}}\n>","desc":"Standalone tags should not require a newline to precede them.","partials":{"partial":">\n>"}},
			{"name":"Standalone Without Newline","data":{},"expected":">\n  >\n  >","template":">\n  {{>partial}}","desc":"Standalone tags should not require a newline to follow them.","partials":{"partial":">\n>"}},
			{"name":"Standalone Indentation","data":{"content":"<\n->"},"expected":"\\\n |\n <\n->\n |\n/\n","template":"\\\n {{>partial}}\n/\n","desc":"Each line of the partial should be indented before rendering.","partials":{"partial":"|\n{{{content}}}\n|\n"}},
			{"name":"Padding Whitespace","data":{"boolean":true},"expected":"|[]|","template":"|{{> partial }}|","desc":"Superfluous in-tag whitespace should be ignored.","partials":{"partial":"[]"}}
		]
	});
});

test("Spec - Sections", function() {
	spec_tests({
		"__ATTN__":"Do not edit this file; changes belong in the appropriate YAML file.",
		"overview":"Section tags and End Section tags are used in combination to wrap a section\nof the template for iteration\n\nThese tags' content MUST be a non-whitespace character sequence NOT\ncontaining the current closing delimiter; each Section tag MUST be followed\nby an End Section tag with the same content within the same section.\n\nThis tag's content names the data to replace the tag.  Name resolution is as\nfollows:\n  1) Split the name on periods; the first part is the name to resolve, any\n  remaining parts should be retained.\n  2) Walk the context stack from top to bottom, finding the first context\n  that is a) a hash containing the name as a key OR b) an object responding\n  to a method with the given name.\n  3) If the context is a hash, the data is the value associated with the\n  name.\n  4) If the context is an object and the method with the given name has an\n  arity of 1, the method SHOULD be called with a String containing the\n  unprocessed contents of the sections; the data is the value returned.\n  5) Otherwise, the data is the value returned by calling the method with\n  the given name.\n  6) If any name parts were retained in step 1, each should be resolved\n  against a context stack containing only the result from the former\n  resolution.  If any part fails resolution, the result should be considered\n  falsey, and should interpolate as the empty string.\nIf the data is not of a list type, it is coerced into a list as follows: if\nthe data is truthy (e.g. `!!data == true`), use a single-element list\ncontaining the data, otherwise use an empty list.\n\nFor each element in the data list, the element MUST be pushed onto the\ncontext stack, the section MUST be rendered, and the element MUST be popped\noff the context stack.\n\nSection and End Section tags SHOULD be treated as standalone when\nappropriate.\n",
		"tests":[
			{"name":"Truthy","data":{"boolean":true},"expected":"\"This should be rendered.\"","template":"\"{{#boolean}}This should be rendered.{{/boolean}}\"","desc":"Truthy sections should have their contents rendered."},
			{"name":"Falsey","data":{"boolean":false},"expected":"\"\"","template":"\"{{#boolean}}This should not be rendered.{{/boolean}}\"","desc":"Falsey sections should have their contents omitted."},
			{"name":"Context","data":{"context":{"name":"Joe"}},"expected":"\"Hi Joe.\"","template":"\"{{#context}}Hi {{name}}.{{/context}}\"","desc":"Objects and hashes should be pushed onto the context stack."},
			{"name":"Deeply Nested Contexts","data":{"a":{"one":1},"b":{"two":2},"c":{"three":3},"d":{"four":4},"e":{"five":5}},"expected":"1\n121\n12321\n1234321\n123454321\n1234321\n12321\n121\n1\n","template":"{{#a}}\n{{one}}\n{{#b}}\n{{one}}{{two}}{{one}}\n{{#c}}\n{{one}}{{two}}{{three}}{{two}}{{one}}\n{{#d}}\n{{one}}{{two}}{{three}}{{four}}{{three}}{{two}}{{one}}\n{{#e}}\n{{one}}{{two}}{{three}}{{four}}{{five}}{{four}}{{three}}{{two}}{{one}}\n{{/e}}\n{{one}}{{two}}{{three}}{{four}}{{three}}{{two}}{{one}}\n{{/d}}\n{{one}}{{two}}{{three}}{{two}}{{one}}\n{{/c}}\n{{one}}{{two}}{{one}}\n{{/b}}\n{{one}}\n{{/a}}\n","desc":"All elements on the context stack should be accessible."},
			{"name":"List","data":{"list":[{"item":1},{"item":2},{"item":3}]},"expected":"\"123\"","template":"\"{{#list}}{{item}}{{/list}}\"","desc":"Lists should be iterated; list items should visit the context stack."},
			{"name":"Empty List","data":{"list":[]},"expected":"\"\"","template":"\"{{#list}}Yay lists!{{/list}}\"","desc":"Empty lists should behave like falsey values."},
			{"name":"Doubled","data":{"two":"second","bool":true},"expected":"* first\n* second\n* third\n","template":"{{#bool}}\n* first\n{{/bool}}\n* {{two}}\n{{#bool}}\n* third\n{{/bool}}\n","desc":"Multiple sections per template should be permitted."},
			{"name":"Nested (Truthy)","data":{"bool":true},"expected":"| A B C D E |","template":"| A {{#bool}}B {{#bool}}C{{/bool}} D{{/bool}} E |","desc":"Nested truthy sections should have their contents rendered."},
			{"name":"Nested (Falsey)","data":{"bool":false},"expected":"| A  E |","template":"| A {{#bool}}B {{#bool}}C{{/bool}} D{{/bool}} E |","desc":"Nested falsey sections should be omitted."},
			{"name":"Context Misses","data":{},"expected":"[]","template":"[{{#missing}}Found key 'missing'!{{/missing}}]","desc":"Failed context lookups should be considered falsey."},
			{"name":"Implicit Iterator - String","data":{"list":["a","b","c","d","e"]},"expected":"\"(a)(b)(c)(d)(e)\"","template":"\"{{#list}}({{.}}){{/list}}\"","desc":"Implicit iterators should directly interpolate strings."},
			{"name":"Implicit Iterator - Integer","data":{"list":[1,2,3,4,5]},"expected":"\"(1)(2)(3)(4)(5)\"","template":"\"{{#list}}({{.}}){{/list}}\"","desc":"Implicit iterators should cast integers to strings and interpolate."},
			{"name":"Implicit Iterator - Decimal","data":{"list":[1.1,2.2,3.3,4.4,5.5]},"expected":"\"(1.1)(2.2)(3.3)(4.4)(5.5)\"","template":"\"{{#list}}({{.}}){{/list}}\"","desc":"Implicit iterators should cast decimals to strings and interpolate."},
			{"name":"Dotted Names - Truthy","data":{"a":{"b":{"c":true}}},"expected":"\"Here\" == \"Here\"","template":"\"{{#a.b.c}}Here{{/a.b.c}}\" == \"Here\"","desc":"Dotted names should be valid for Section tags."},
			{"name":"Dotted Names - Falsey","data":{"a":{"b":{"c":false}}},"expected":"\"\" == \"\"","template":"\"{{#a.b.c}}Here{{/a.b.c}}\" == \"\"","desc":"Dotted names should be valid for Section tags."},
			{"name":"Dotted Names - Broken Chains","data":{"a":{}},"expected":"\"\" == \"\"","template":"\"{{#a.b.c}}Here{{/a.b.c}}\" == \"\"","desc":"Dotted names that cannot be resolved should be considered falsey."},
			{"name":"Surrounding Whitespace","data":{"boolean":true},"expected":" | \t|\t | \n","template":" | {{#boolean}}\t|\t{{/boolean}} | \n","desc":"Sections should not alter surrounding whitespace."},
			{"name":"Internal Whitespace","data":{"boolean":true},"expected":" |  \n  | \n","template":" | {{#boolean}} {{! Important Whitespace }}\n {{/boolean}} | \n","desc":"Sections should not alter internal whitespace."},
			{"name":"Indented Inline Sections","data":{"boolean":true},"expected":" YES\n GOOD\n","template":" {{#boolean}}YES{{/boolean}}\n {{#boolean}}GOOD{{/boolean}}\n","desc":"Single-line sections should not alter surrounding whitespace."},
			{"name":"Standalone Lines","data":{"boolean":true},"expected":"| This Is\n|\n| A Line\n","template":"| This Is\n{{#boolean}}\n|\n{{/boolean}}\n| A Line\n","desc":"Standalone lines should be removed from the template."},
			{"name":"Indented Standalone Lines","data":{"boolean":true},"expected":"| This Is\n|\n| A Line\n","template":"| This Is\n  {{#boolean}}\n|\n  {{/boolean}}\n| A Line\n","desc":"Indented standalone lines should be removed from the template."},
			{"name":"Standalone Line Endings","data":{"boolean":true},"expected":"|\r\n|","template":"|\r\n{{#boolean}}\r\n{{/boolean}}\r\n|","desc":"\"\\r\\n\" should be considered a newline for standalone tags."},
			{"name":"Standalone Without Previous Line","data":{"boolean":true},"expected":"#\n/","template":"  {{#boolean}}\n#{{/boolean}}\n/","desc":"Standalone tags should not require a newline to precede them."},
			{"name":"Standalone Without Newline","data":{"boolean":true},"expected":"#\n/\n","template":"#{{#boolean}}\n/\n  {{/boolean}}","desc":"Standalone tags should not require a newline to follow them."},
			{"name":"Padding","data":{"boolean":true},"expected":"|=|","template":"|{{# boolean }}={{/ boolean }}|","desc":"Superfluous in-tag whitespace should be ignored."}
		]
	});
});

test("Spec", function() {
	equals(
		Mustache.to_html(
			'{{!blah!}}\nHi yo.'
		)
		, 'Hi yo.'
		, 'Something something something.'
	);
	
	equals(
		Mustache.to_html(
			'Begin.\n{{>partial}}\nEnd.'
			, {}
			, {partial: 'For aiur.'}
		)
		, 'Begin.\nFor aiur.End.'
		, 'Something else'
	);
	
	equals(
		Mustache.to_html(
			'Begin.\n{{#tag}}\nhi\n{{/tag}}\nEnd.'
			, {tag: true}
			, {}
		)
		, 'Begin.\nhi\nEnd.'
		, 'Something else'
	);
});