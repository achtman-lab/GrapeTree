/**
 * Very basic NEXUS parser
 *
 * Supports TREES block
 *
 */
 
//--------------------------------------------------------------------------------------------------
// http://stackoverflow.com/questions/1303646/check-whether-variable-is-number-or-string-in-javascript
function isNumber (o) {
  return ! isNaN (o-0);
}

//--------------------------------------------------------------------------------------------------
//https://raw.github.com/kvz/phpjs/master/functions/strings/strstr.js
function strstr (haystack, needle, bool) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: strstr('Kevin van Zonneveld', 'van');
  // *     returns 1: 'van Zonneveld'
  // *     example 2: strstr('Kevin van Zonneveld', 'van', true);
  // *     returns 2: 'Kevin '
  // *     example 3: strstr('name@example.com', '@');
  // *     returns 3: '@example.com'
  // *     example 4: strstr('name@example.com', '@', true);
  // *     returns 4: 'name'
  var pos = 0;

  haystack += '';
  pos = haystack.indexOf(needle);
  if (pos == -1) {
    return false;
  } else {
    if (bool) {
      return haystack.substr(0, pos);
    } else {
      return haystack.slice(pos);
    }
  }
}

//--------------------------------------------------------------------------------------------------
// https://github.com/kvz/phpjs/blob/master/functions/strings/strchr.js
function strchr (haystack, needle, bool) {
  // http://kevin.vanzonneveld.net
  // +   original by: Philip Peterson
  // -    depends on: strstr
  // *     example 1: strchr('Kevin van Zonneveld', 'van');
  // *     returns 1: 'van Zonneveld'
  // *     example 2: strchr('Kevin van Zonneveld', 'van', true);
  // *     returns 2: 'Kevin '
  return this.strstr(haystack, needle, bool);
}

var NEXUSPunctuation = "()[]{}/\\,;:=*'\"`+-";
var NEXUSWhiteSpace  = "\n\r\t ";

//--------------------------------------------------------------------------------------------------
function TokenTypes(){} 
TokenTypes.None 		= 0;
TokenTypes.String 		= 1;
TokenTypes.Hash 		= 2;
TokenTypes.Number 		= 3;
TokenTypes.SemiColon 	= 4;
TokenTypes.OpenPar		= 5;
TokenTypes.ClosePar 	= 6;
TokenTypes.Equals 		= 7;
TokenTypes.Space 		= 8;
TokenTypes.Comma  		= 9;
TokenTypes.Asterix 		= 10;
TokenTypes.Colon 		= 11;
TokenTypes.Other 		= 12;
TokenTypes.Bad 			= 13;
TokenTypes.Minus 		= 14;
TokenTypes.DoubleQuote 	= 15;
TokenTypes.Period 		= 16;
TokenTypes.Backslash 	= 17;
TokenTypes.QuotedString	= 18;

//--------------------------------------------------------------------------------------------------
function NumberTokens(){}
NumberTokens.start 		= 0;
NumberTokens.sign 		= 1;
NumberTokens.digit 		= 2;
NumberTokens.fraction 	= 3;
NumberTokens.expsymbol 	= 4;
NumberTokens.expsign 	= 5;
NumberTokens.exponent 	= 6;
NumberTokens.bad 		= 7;
NumberTokens.done 		= 8;

//--------------------------------------------------------------------------------------------------
function StringTokens(){}
StringTokens.ok 		= 0;
StringTokens.quote 		= 1;
StringTokens.done 		= 2;

//--------------------------------------------------------------------------------------------------
function NexusError(){}
NexusError.ok 			= 0;
NexusError.nobegin 		= 1;
NexusError.noend 		= 2;
NexusError.syntax 		= 3;
NexusError.badcommand 	= 4;
NexusError.noblockname 	= 5;
NexusError.badblock	 	= 6;
NexusError.nosemicolon	= 7;

//--------------------------------------------------------------------------------------------------
function Scanner(str)
{
	this.error = 0;
	this.comment = '';
	this.pos = 0;
	this.str = str;
	this.token = 0;
	this.buffer = '';
	this.returnspace = false;
	this.taxa={};
	this.current_node="";
	this.nodes={};
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.GetToken = function(returnspace)
{		
	this.returnspace = typeof returnspace !== 'undefined' ? returnspace : false;
	
	this.token = TokenTypes.None;
	
	while ((this.token == TokenTypes.None) && (this.pos < this.str.length))
	{
		//console.log(this.str.charAt(this.pos));
		//console.log(this.buffer);
		//console.log(this.token);
		
		if (strchr(NEXUSWhiteSpace, this.str.charAt(this.pos)))
		{
			if (this.returnspace && (this.str.charAt(this.pos) == ' '))
			{
				this.token = TokenTypes.Space;
			}
		}
		else
		{
			if (strchr(NEXUSPunctuation, this.str.charAt(this.pos)))
			{
				this.buffer = this.str.charAt(this.pos);
				switch (this.str.charAt(this.pos))
			
				{
					case '[':
						this.ParseComment();
						break;
					case "'":
						if (this.ParseString())
						{
							this.token = TokenTypes.QuotedString;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
						break;
					case '(':
						this.token = TokenTypes.OpenPar;
						break;
					case ')':
						this.token = TokenTypes.ClosePar;
						break;
					case '=':
						this.token = TokenTypes.Equals;
						break;
					case ';':
						this.token = TokenTypes.SemiColon;
						break;
					case ',':
						this.token = TokenTypes.Comma;
						break;
					case '*':
						this.token = TokenTypes.Asterix;
						break;
					case ':':
						this.token = TokenTypes.Colon;
						break;
					case '-':
						this.token = TokenTypes.Minus;
						break;
					case '"':
						this.token = TokenTypes.DoubleQuote;
						break;
					case '/':
						this.token = TokenTypes.BackSlash;
						break;
					default:
						this.token = TokenTypes.Other;
						break;
				}
			}
			else
			{
				if (this.str.charAt(this.pos) == '#')
				{
					this.token = TokenTypes.Hash;
				}
				else if (this.str.charAt(this.pos) == '.')
				{
					this.token = TokenTypes.Period;
				}
				else
				{
					if (isNumber(this.str.charAt(this.pos)))
					{
						if (this.ParseNumber())
						{
							this.token = TokenTypes.Number;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
					}
					else
					{
						if (this.ParseToken())
						{
							this.token = TokenTypes.String;
						}
						else
						{
							this.token = TokenTypes.Bad;
						}
					}
				}
			}
		}
		this.pos++;
	}
	return this.token;
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseComment = function()
{		
	this.buffer = '';
	
	while ((this.str.charAt(this.pos) != ']') && (this.pos < this.str.length))
	{
		this.buffer += this.str.charAt(this.pos);
		this.pos++;
	}
	this.buffer += this.str.charAt(this.pos);
	/*var trim = this.buffer.substring(1,this.buffer.length-1);
	var info = trim.split("&");
	for (var index in info){
		if (!info[index]){
			continue;
		}
		var args = info[index].split("=");
		if (args.length <=1){
			continue;
		}
		var val = args[1].substring(1,args[1].length-1);
		var val_list = val.split(",");
		this.nodes[this.current_node]={}
		this.nodes[this.current_node][args[0]]=val_list;
	
	}
	*/
	this.current_comment=this.buffer;
	return this.buffer;
	//console.log('[' + this.buffer + ']');
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseNumber = function()
{		
	this.buffer = '';
	var state = NumberTokens.start;
	
	while (
		(this.pos < this.str.length)
		&& (!strchr (NEXUSWhiteSpace, this.str.charAt(this.pos)))
		&& (!strchr (NEXUSPunctuation, this.str.charAt(this.pos)))
		&& (this.str.charAt(this.pos) != '-')
		&& (state != NumberTokens.bad)
		&& (state != NumberTokens.done)
		)
	{
		if (isNumber(this.str.charAt(this.pos)))
		{
			switch (state)
			{
				case NumberTokens.start:
				case NumberTokens.sign:
					state =  NumberTokens.digit;
					break;
				case NumberTokens.expsymbol:
				case NumberTokens.expsign:
					state =  NumberTokens.exponent;
					break;
				default:
					break;
			}
		}
		else if ((this.str.charAt(this.pos) == '-') && (this.str.charAt(this.pos) == '+'))
		{
			switch (state)
			{
				case NumberTokens.start:
					state = NumberTokens.sign;
					break;
				case NumberTokens.digit:
					state = NumberTokens.done;
					break;
				case NumberTokens.expsymbol:
					state = NumberTokens.expsign;
					break;
				default:
					state = NumberTokens.bad;
					break;
			}
		}
		else if ((this.str.charAt(this.pos) == '.') && (state == NumberTokens.digit))
		{
			state = NumberTokens.fraction;
		}
		else if (((this.str.charAt(this.pos) == 'E') || (this.str.charAt(this.pos) == 'e')) && ((state == NumberTokens.digit) || (state == NumberTokens.fraction)))			
		{
			state = NumberTokens.expsymbol;
		}
		else
		{
			state = NumberTokens.bad;
		}
		
		if ((state != NumberTokens.bad) && (state != NumberTokens.done))
		{
			this.buffer += this.str.charAt(this.pos);
			this.pos++;
		}
	}
	this.pos--;
	
	//console.log(this.buffer);
	
	return true; 		
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseString = function()
{		
	this.buffer = '';
	
	this.pos++;
	
	var state = StringTokens.ok;
	while ((state != StringTokens.done) && (this.pos < this.str.length))
	{
		//console.log(this.pos + ' ' + this.str.charAt(this.pos));
		switch (state)
		{
			case StringTokens.ok:
				if (this.str.charAt(this.pos) == "'")
				{
					state = StringTokens.quote;
				}
				else
				{
					this.buffer += this.str.charAt(this.pos);
				}
				break;
				
			case StringTokens.quote:
				if (this.str.charAt(this.pos) == "'")
				{
					this.buffer += this.str.charAt(this.pos);
					state = StringTokens.ok;
				}
				else
				{
					state = StringTokens.done;
					this.pos--;
				}
				break;
				
			default:
				break;
		}			
		this.pos++;
	}
	this.pos--;
	
	//console.log(this.buffer);	
	return (state == StringTokens.done) ? true : false;
}

//----------------------------------------------------------------------------------------------
Scanner.prototype.ParseToken = function()
{
	this.buffer = '';
	
	while (
		this.pos < this.str.length
		&& (!strchr (NEXUSWhiteSpace, this.str.charAt(this.pos)))
			&& (!strchr (NEXUSPunctuation, this.str.charAt(this.pos)))
			)
		{
			this.buffer += this.str.charAt(this.pos);
			this.pos++;
		}
	this.pos--;
	
	//console.log(this.buffer);
	
	return true;
}

//--------------------------------------------------------------------------------------------------
NexusReader.prototype = new Scanner;

//----------------------------------------------------------------------------------------------
function NexusReader()
{
	Scanner.apply(this, arguments);
	
	this.nexusCommands = ['begin', 'dimensions', 'end', 'endblock', 'link', 'taxa', 'taxlabels', 'title', 'translate', 'tree'];
	this.nexusBlocks = ['taxa', 'trees'];
};

//----------------------------------------------------------------------------------------------
NexusReader.prototype.GetBlock = function()
{
	var blockname = '';
	
	var command = this.GetCommand();
	
	//console.log('GetBlock: ' + this.buffer + ' ' + command);	 

	if (command.toLowerCase() != 'begin')
	{
		this.error = NexusError.nobegin;
	}
	else
	{
		// get block name
		var t = this.GetToken();
		
		//console.log('GetCommand: ' + this.buffer);		
		if (t == TokenTypes.String)
		{
			blockname = this.buffer.toLowerCase();
			t = this.GetToken();
			if (t != TokenTypes.SemiColon)
			{
				this.error = NexusError.noblockname;
			}
		}
		else
		{
			this.error = NexusError.noblockname;
		}
		
	}
	return blockname.toLowerCase();
}

//----------------------------------------------------------------------------------------------
NexusReader.prototype.GetCommand = function()
{
	var command = '';
	
	var t = this.GetToken();
	
	//console.log('GetCommand: ' + this.buffer);
	
	if (t == TokenTypes.String)
	{
		if (this.nexusCommands.indexOf(this.buffer.toLowerCase()) != -1)
		{
			command = this.buffer.toLowerCase();
		}
		else
		{
			this.error = NexusError.badcommand;
		}
	}
	else
	{
		this.error = NexusError.syntax;
	}
	return command.toLowerCase();
}
	
//----------------------------------------------------------------------------------------------
NexusReader.prototype.IsNexusFile = function()
{
	this.error = NexusError.ok;
	
	var nexus = false;
	var t = this.GetToken();
	if (t == TokenTypes.Hash)
	{
		t = this.GetToken();
		if (t == TokenTypes.String)
		{
			nexus = ( this.buffer.toLowerCase() == 'nexus') ? true : false;
		}
	}
	return nexus;
}

//----------------------------------------------------------------------------------------------
NexusReader.prototype.SkipCommand = function()
{	
	var t = null;
	do {
		t = this.GetToken();
	} while ((this.error == NexusError.ok) && (t != TokenTypes.SemiColon));
	return this.error;
}

//--------------------------------------------------------------------------------------------------
function parse_nexus(str)
{
	var nexus = {};
	
	nexus.status = NexusError.ok;
	
	var nx = new NexusReader(str);

	if (nx.IsNexusFile()) 
	{
		//console.log('Is a NEXUS file');		
	}
		
	var blockname = nx.GetBlock();
	
	//console.log("BLOCK="+blockname);
	
		
	if (blockname == 'taxa')
	{
		var command = nx.GetCommand();
		
		while ( 
			(command != 'end') 
			&& (command != 'endblock')
			&& (nx.error == NexusError.ok)
			)
		{		
			switch (command)
			{
				case 'taxlabels':
					var t = nx.GetToken();
					while (t !==4){
						nx.taxa[nx.buffer]={}
						t = nx.GetToken();
					
					}
					
					command = nx.GetCommand();
					break;	
					
				default:
					//echo "Command to skip: $command\n";
					nx.SkipCommand();
					command = nx.GetCommand();
					break;
			}
			
			// If end command eat the semicolon
			if ((command == 'end') || (command == 'endblock'))
			{
				nx.GetToken();
			}
		}
		
		blockname = nx.GetBlock();
					
	}
	
	
	if (blockname == 'trees')
	{
		nexus.treesblock = {};
		nexus.treesblock.trees = [];
		
		command = nx.GetCommand();
				
		while ( 
			((command != 'end') && (command != 'endblock'))
			&& (nx.error == NexusError.ok)
			)
		{
			// console.log(command);
			
			switch (command)
			{
				case 'translate':
				
					// translation table is an associative array
					nexus.treesblock.translate = {};
					
					var done = false;
					while (!done && (nx.error == NexusError.ok))
					{
						var t = nx.GetToken();
						
						if ([TokenTypes.Number, TokenTypes.String, TokenTypes.QuotedString].indexOf(t) != -1)
						{
							var otu = nx.buffer;
							t = nx.GetToken();
							
							if ([TokenTypes.Number, TokenTypes.String, TokenTypes.QuotedString].indexOf(t) != -1)
							{
								// cast otu to string 
								nexus.treesblock.translate[String(otu)] = nx.buffer;
								
								//console.log(otu + ' ' + nx.buffer);
								
								t = nx.GetToken();
								switch (t)
								{
									case TokenTypes.Comma:
										break;
										
									case TokenTypes.SemiColon:
										done = true;
										break;
										
									default:
										nx.error = NexusError.syntax;
										break;
								}
							}
							else
							{
								nx.error = NexusError.syntax;
							}
						}
						else
						{
							nx.error = NexusError.syntax;
						}
					}					
					
					command = nx.GetCommand();
					break;
					
				case 'tree':	
					if (command == 'tree')
					{
						var tree = {};
						
						t = nx.GetToken();
						if (t == TokenTypes.Asterix)
						{
							tree.default = true;
							t = nx.GetToken();
						}
						if (t == TokenTypes.String)
						{
							tree.label = nx.buffer;
						}
						t = nx.GetToken();
						if (t == TokenTypes.Equals)
						{
							tree.newick = '';
							t = nx.GetToken();
							while (t != TokenTypes.SemiColon)
							{
								if (t == TokenTypes.QuotedString)
								{
									var s = nx.buffer;
									s = s.replace("'", "''");
									s = "'" + s + "'";
									tree.newick += s;
								}
								else
								{	
									if (nx.previous_token ==5 || nx.previous_token==6 || nx.previous_token ==9){
	
										if (t==1 || t ==3){
											nx.current_node=nx.buffer
										}
										else if (t==6 || t==9 || t==11){
											nx.current_node='hypothetical_node';
											tree.newick+="hypothetical_node";
										}
								
									}
									//end of node
									if (t==6 || t==9){
										console.log(nx.current_node)
										console.log(nx.current_comment);
										nx.current_comment="";
										nx.current_node="";
									}
									tree.newick += nx.buffer;
								}
								nx.previous_token = t;
								t = nx.GetToken();
								
							}
							tree.newick += ';';
							
							nexus.treesblock.trees.push(tree);
						}
						
					}				
					command = nx.GetCommand();
					break;
	
				default:
					//echo "Command to skip: $command\n";
					nx.SkipCommand();
					command = nx.GetCommand();
					break;
			}
			
			// If end command eat the semicolon
			if ((command == 'end') || (command == 'endblock'))
			{
				nx.GetToken();
			}
			
			
		}
	
	}
	
	nexus.status = nx.error;
	nexus.nodes=nx.nodes;
	return nexus;
}
