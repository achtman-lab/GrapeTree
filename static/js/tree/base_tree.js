
 
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
	this.hypo_node=1;
	this.node_information={};
	this.reg_ex=(/\{.+?\}/g);
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
											nx.current_node='_hypo_'+nx.hypo_node;
											tree.newick+='_hypo_'+nx.hypo_node;
											nx.hypo_node++;
										}
								
									}
									//end of node
									if (t==6 || t==9){
										if (nx.current_comment ){
											nx.node_information[nx.current_node]={};
											var info = nx.current_comment.substring(1,nx.current_comment.length-1);
											while(m=nx.reg_ex.exec(nx.current_comment)){
												 var temp = m[0].replace(",","|")
												 info= info.replace(m[0],temp)
											
											}
											var arr = info.split(",");
											for (var index  in arr){
												var arr2 = arr[index].split("=");
												var value = arr2[1];
												if (arr2[1].startsWith("{")){
													var value = arr2[1].substring(1,arr2[1].length-1).split("|");
													
												}
												nx.node_information[nx.current_node][arr2[0]]=value;
												
											}
										}
										
										
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
	nexus.node_information=nx.node_information;
	return nexus;
}









D3BaseTree.prototype = Object.create(null);
D3BaseTree.prototype.constructor=D3BaseTree;


/**
*  The base class for trees
* @constructor
* @param {string} element_id - The id of the container for the tree
* @param {object} metadata - (optional ) An object describing the trees metadata see {@link D3BaseTree#addMetadata}
* @param {integer} height - the initial height. The container will be reisized to this height. If absent, the height of the container will be used
* @param {integer} width - the initial width. The container will be reisized to this width If absent, the width of the container will be used
*
*/
function D3BaseTree(element_id,metadata,height,width){
	var self=this;
	this.legend_div=$("<div>").css({"position":"absolute","overflow-x":"hidden"}).css({"top":"0px","right":"0px"}).draggable();
	this.scale_div=$("<div>").css({"position":"absolute","overflow-x":"hidden", "overflow-y":"hidden"}).css({"bottom":"100px","left":"20px"}).draggable();
	this.container = $("#"+element_id)
				    .css("position","fixed")
				    .append(this.legend_div)
				    .append(this.scale_div);
	
	this.height=height;
	this.width=width;
	if (this.width || this.height){
		this.container.width(width).height(height);	
	}
	else{
		this.height= this.container.height();
		this.width=this.container.width();
	}
	
	this.metadata={};
	this.metadata_info = {nothing:{label:"No Category"}};
	this.grouped_nodes={};
	this.metadata_map={};
	if (metadata){
		this.addMetadata(metadata);
	}
	this.show_legend=true;
	
	this.svg = d3.select("#"+element_id).append('svg')
	 .attr("width",this.width)
	.attr("height",this.height)
	.attr("id","mst-svg");
	
	//legend stuff
	this.node_map={};
	this.legend=null;
	this.legend_background;
	this.color_schemes = {
		category: d3.scale.category20().range().concat(
			d3.scale.category20b().range(), d3.scale.category20c().range(), 
			["#FFFF00","#1CE6FF","#FF34FF","#FF4A46","#008941","#006FA6","#A30059","#FFDBE5","#7A4900","#0000A6","#63FFAC","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601",
			 "#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101",
			 "#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459",
			 "#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7",
			 "#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98",
			 "#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5",
			 "#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325",
			 "#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F",
			 "#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749",
			 "#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A",
			 "#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC",
			 "#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2",
			 "#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F",
			 "#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"])
		, 
		category2: 
			["#FFFF00","#1CE6FF","#FF34FF","#FF4A46","#008941","#006FA6","#A30059","#FFDBE5","#7A4900","#0000A6","#63FFAC","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601",
			 "#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101",
			 "#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459",
			 "#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7",
			 "#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98",
			 "#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5",
			 "#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325",
			 "#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F",
			 "#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749",
			 "#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A",
			 "#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC",
			 "#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2",
			 "#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F",
			 "#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"].concat(
				d3.scale.category20().range(), d3.scale.category20b().range(), d3.scale.category20c().range(), )
		, 
		custom: d3.scale.category20().range().concat(
			d3.scale.category20b().range(), d3.scale.category20c().range()), 
		gradient_cool: function(num) {
			var n = num - 1;
			var scale = d3.scale.linear()
				.domain([0, n/4, n/2, n*3/4, n])
				.range(["#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#00007D"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient: function(num) {
			var n = num - 1;
			var scale = d3.scale.linear()
				.domain([0, n/4, n*3/4, n])
				.range(["#FFFF7D", "#FFFF00", "#FF0000", "#7D0000"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow: function(num) {
			var n = num - 1;
			var scale = d3.scale.linear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow2: function(num) {
			var n = num - 1;
			var scale = d3.scale.linear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#FFAFAF", "#FFFFAF", "#AFFFAF", "#AFFFFF", "#AFAFFF", "#FFAFFF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		},
		gradient_rainbow3: function(num) {
			var n = num - 1;
			var scale = d3.scale.linear()
				.domain([0, n/5, n*2/5, n*3/5, n*4/5, n])
				.range(["#AF0000", "#AFAF00", "#00AF00", "#00AFAF", "#0000AF", "#AF00AF"])
				.interpolate(d3.interpolateHcl);
			return Array.apply(null, {length: num}).map(Number.call, Number).map(function(n) {return scale(n);});
		}
	};
	//this.legend_colours = ['default', this.color_schemes.default];
	this.category_num = 30;
	this.default_colour= "white";
	this.category_colours={};
	this.display_category=null;
	this.custom_colours={}
	//date stuff
	this.timeFormat= d3.time.format("%Y-%m-%d");
	this.min_date=null;
	this.max_date=null;
	this.date_scale=null;
	this.calculateDateScale();
	this.treeChangedListeners=[];
	this.nodesSelectedListeners=[];
	this.displayChangedListeners=[];
	
	//Zooming and translating
	this.scale=1;
	this.translate=[0,0];
	
	var x_zoom_scale=d3.scale.linear().domain([0, this.width]).range([0, this.width]);
	var y_zoom_scale = d3.scale.linear().domain([0, this.height]).range([0, this.height]);
	this.zoom = d3.behavior.zoom()
	     .x(x_zoom_scale)
	     .y(y_zoom_scale);
	
	this.background_rect = this.svg.append('rect')
		.attr("pointer-events","all")
		.style('fill', 'none')
		.attr("width", this.width)
		.attr("height", this.height)
		.call(this.zoom.on('zoom', function(){
			self.canvas.attr('transform', "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
			self.scale=d3.event.scale;
			self.translate=d3.event.translate;
			self.updateScaleDiv();
		}))
		.on("dblclick.zoom", null);
	
	this.canvas = this.svg.append("g");
	this.canvas.attr("id","vis");
	//resize
	$(window).resize(function(){
		setTimeout(function(){
			self.resize();
		},100);
	});
	
	//keydown
	d3.select('body').on("keydown",function(e){
		self._keyDown(e);
	}).on("keyup",function(e){
		d3.selectAll(".brush").remove();
	});
	
}

D3BaseTree.prototype.parseNewick =  function (a, taxa_map){
	this.newickTree = a;
	for(var e=[],r={},s=a.split(/\s*(;|\(|\)|,|:)\s*/),t=0;t<s.length;t++){
		var n=s[t];
		switch(n){
			case"(":var c={};r.children=[c],e.push(r),r=c;break;
			case",":var c={};e[e.length-1].children.push(c),r=c;break;
			case")":r=e.pop();break;
			case":":break;
			default: {
				var h=s[t-1];
				")"===h||"("===h||","===h ? (r.name=taxa_map && taxa_map[n] ? taxa_map[n] : n) : ":"===h && (r.length=parseFloat(n));
			}
		}
	}
	return r;
};
D3BaseTree.prototype.parseNexus =  function (tre){
	var a1 = tre.split(/begin trees;\s+/)[1];
	var taxa_map = {};
	if (a1.search('translate') >= 0) {
		var aa = a1.split(';');
		var [a3, a2] = [aa[0], aa[1]];
		for (var a4=a3.split(/[\s,]+/), t=1; t+1 <a4.length; t+= 2) {
			taxa_map[a4[t]] = a4[t+1];
		}
	} else {
		var [a3, a2] = [null, a1.split(';')[0]];
	}
	var a2 = ['(', a2.split(/^[^(]+\(/)[1], ';'].join('').split(/(\[|\])/);
	var a = [];
	for (var a = [], t=0, inNote=0; t < a2.length; t ++) {
		var n = a2[t];
		switch(n) {
			case"[": inNote = 1; break;
			case"]": inNote = 0; break;
			default: if (! inNote) a.push(n);
		}
	}
	return this.parseNewick(a.join(''), taxa_map);
};







D3BaseTree.prototype.readNexusFile = function (text){
	var nexus=parse_nexus(text);
	var newick = nexus.treesblock.trees[0].newick;
	var root= this.parseNewick(newick,nexus.treesblock.translate);
	return {"root":root,"translate":nexus.treesblock.translate,"node_information":nexus.node_information};
}



/**
* Adds metadata to the tree 
* @param {object} metadata - An object containing id to a list of key value pairs.If there is
* a one to one relationship beteween the nodes and metadata, then the id should correspond 
* to the node id e,g,
* <pre>
* {
*	node_a:{year:"1987",color:"red"},
*	node_b:{.....}
*	,....
* } 
* </pre>
* If a node reprsents several entities e.g.an ST has several strins, then an ID property is required,
* which is the ID of node e.g.
* <pre>
* {
	strain_a:{year:"1988",virulence:"high",ID:"ST27"},
	strain_b:{year:"1987",virulence:"low",ID:"ST27"},
	strain_c:{year:"1989",virulence:"medium",ID:"ST28"},
	....
* }
* </pre>
* If the id already exists, than new properties will be added or existing ones altered e.g.
* <pre>
* {
* strain_a:{year:"1999",new_category:"value1"}
* }
* </pre>
*/

/**
* Deletes the specified category from all metadata
* @param {string} The category to delete
*/
D3BaseTree.prototype.removeCategory=function(category){
	for (var key in this.metadata){
		var item = this.metadata[key];
		delete item[category];
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_altered",this);	
	}	
};


/**
* Resizes the tree components based on the size of the container
* This method is automatically called if the window is resized,
* but should be called if the container is resized manually
*/

D3BaseTree.prototype.resize=function(){
	this.width = this.container.width();
	this.height = this.container.height();
	this.svg.attr('width', this.width).attr('height', this.height);
	var x_scale = d3.scale.linear().domain([0, this.width]).range([0, this.width]);
	var y_scale = d3.scale.linear().domain([0, this.height]).range([0, this.height]);
	var temp_scale=this.zoom.scale();
	var temp_trans=this.zoom.translate();
	this.zoom.x(x_scale).y(y_scale);
	this.zoom.scale(temp_scale);
	this.zoom.translate(temp_trans);
	this.background_rect.attr('height', this.height).attr('width', this.width);
	//this.legend_div.css({"top":"0px","right":"0px"});
	if (this.legend_div.position().top < 0) {
		this.legend_div.css({"top":"0px"});
	}
	if (this.legend_div.position().left > this.width-300) {
		this.legend_div.css({"left":this.width-300});
	}
	//this.updateScaleDiv();
	if (this.scale_div.position().top < 0) {
		this.scale_div.css({"top":"0px"});
	}
	if (this.scale_div.position().left > this.width-300) {
		this.scale_div.css({"left":this.width-300});
	}
};

/** Sets the scale (size of the tree)
* @param {float} scale - The scale to set e.g 2
* @param {boolean} relative - If true than the current scale will be multiplied by the scale parameter e.g 0.5,true
* would halve the current size of the tree
*/
D3BaseTree.prototype.setScale=function(scale,relative){
	if (relative){
		scale *= this.scale;
	}
	this.zoom.scale(scale);
	this.zoom.event(this.canvas);
};


/** Sets the translate (offset of the tree)
* @param {array} scale - An array containing the x,y offsets eg [30,-100]
*/
D3BaseTree.prototype.setTranslate=function(x_y){
	this.zoom.translate(x_y)
	this.zoom.event(this.canvas);
}


D3BaseTree.prototype._changeCategory=function(category){
	var self = this;
	if (! this.metadata_info) this.metadata_info = {};
	if (!(category in this.metadata_info)) this.metadata_info[category] = {}
	if (! this.metadata_info[category].coltype) this.metadata_info[category].coltype = 'character';
	if (! this.metadata_info[category].grouptype) this.metadata_info[category].grouptype = 'size';
	if (! this.metadata_info[category].colorscheme) this.metadata_info[category].colorscheme = 'category';
	if (! this.metadata_info[category].minnum) this.metadata_info[category].minnum = 0;
	if (! this.metadata_info[category].category_num) this.metadata_info[category].category_num = 30;

	var coltype = this.metadata_info[category].coltype;
	var grouptype = this.metadata_info[category].grouptype;
	var colorscheme = this.metadata_info[category].colorscheme;
	var minnum = this.metadata_info[category].minnum;
	var category_num = this.metadata_info[category].category_num;

	var cust_col = this.custom_colours[category];
	this.display_category = category;
	var cat_count = {};
	if (category != 'nothing') {
		cat_count = Object.values(this.metadata)
			.filter(function(d) {return (d.ID in self.node_map) })
			.map(function(d) {return d[category]})
			.filter(function(d) {return (d || d === 0)})
			.reduce(function(c, d) {c[d] = d in c ? c[d]+1:1; return c}, {});
	}

	var cat_count_list = Object.entries(cat_count)
		.filter(function(ent) {
			return ent[1] >= minnum;
		})
		.map(function(ent) {
			if (coltype != 'character' && isNumber(ent[0])) {
				return [parseFloat(ent[0]), ent[1], '', 0];
			} else {
				return [ent[0], ent[1], '', 0];
			}
		})
		.sort(function(a,b){
			if (grouptype != 'size') {
				return (a[3] == b[3]) ? (a[0]>=b[0]?1:-1) : a[3]-b[3];
			} else {
				return (a[1] == b[1]) ? ((a[3] == b[3]) ? (a[0]>=b[0]?1:-1) : a[3]-b[3]) : (a[1]<b[1]?1:-1);
			}
		});


	this.category_colours = {};
	var color_num = cat_count_list.length > category_num ? category_num : cat_count_list.length;

	try {
		var auto_col = this.color_schemes[colorscheme](color_num);
	} catch (e) {
		var auto_col = this.color_schemes[colorscheme];
	}

	for (var colour_count in cat_count_list){
		var val = cat_count_list[colour_count][0];

		if (cust_col && cust_col[val]){
			this.category_colours[val]=cust_col[val];
			cat_count_list[colour_count][2] = cust_col[val];
			continue;	
		} else if (! auto_col[colour_count] || colour_count >= color_num) {
			cat_count_list[colour_count][2] = this.category_colours[val] = ''; //this.default_colour;
		} else {
			cat_count_list[colour_count][2] = this.category_colours[val] = auto_col[colour_count];
		}
	}
	//this.category_colours["Others"] = this.default_colour;
	this.updateLegend(category, cat_count_list);
	for (var i in this.displayChangedListeners){
		this.displayChangedListeners[i]("category_changed",category);
	
	}
	
}

/**
* Retreives metadata
* @returns {object} An object containing id to a list of key value pairs see {@link D3BaseTree#addMetadata}

*/
D3BaseTree.prototype.getMetadata=function(){
	return this.metadata;
};           

/**
* Searches the metadata values associated 
* with the node for the keyword
* @param {string} keyword The word to use for the search
* @param {string} The  key )field of the metadata to search.
* if not provides will search all fields
* @returns {list} All the node ids where the keyword was found
*/
D3BaseTree.prototype.searchMetadata=function(keyword, key){
	var ids = [];
	var exp = new RegExp(keyword,"i");
	for (var id in this.grouped_nodes){
		var contains = false;
		var list = this.grouped_nodes[id];
		for (var i in list){
			var meta_id = this.metadata_map[list[i]];
			if (meta_id){
				var metadata= this.metadata[meta_id];
				var contains = false
				if (!key){
					for (var field in metadata){
						if (metadata[field]){
							var look = metadata[field]+"";
							if (look.match(exp)){
								ids.push(id);
								contains=true;
								break;
							}
						}
						
					}
				}
				else{
					if (metadata[key]){
							var look = metadata[key]+"";
							if (look.match(exp)){
								ids.push(id);
								contains=true;
							}
					}					
				}
				if (contains){
					break;
				}
			}
		}
		
	}
	return ids;

}

D3BaseTree.prototype.getAllIDs=function(){
	var ids =[];
	for (var id in this.metadata){
		if (id.startsWith("_hypo_")){
			continue;
		}
		ids.push(id);      
	}      
	return ids;
}

/**
* Hide/Show the menu
* @param {boolean} show If true the menu will be shown
*/
D3BaseTree.prototype.showLegend= function (show){
	this.show_legend=show;
	if (show){
		this.legend_div.show();
	}
	else{
		this.legend_div.hide();
	}

};

D3BaseTree.prototype._updateScaleDivSize = function(scaleLength) {
	var d_scale = this.distance_scale ? this.distance_scale(1) : this.xScale(1);
	var scaleValue = scaleLength/this.scale/d_scale;
	var digit = -Math.floor(Math.log10(scaleValue));
	var scaleValue = digit > 0 ? scaleValue.toFixed(digit) : Math.round(scaleValue/Math.pow(10, -digit))*Math.pow(10, -digit);
	var scaleLength = scaleValue*d_scale*this.scale;
	return {scaleValue:scaleValue, scaleLength:scaleLength};
}



D3BaseTree.prototype.updateScaleDiv = function() {
	var self = this;
	var dim = this._updateScaleDivSize(100);
	d3.select(this.scale_div[0]).select("svg").remove();
	var scale_svg = d3.select(this.scale_div[0]).append('svg').attr("id","scale-svg");
	var scale = scale_svg.append("g").attr('class', 'scale-bar');
	scale.selectAll('.scale-title').remove();
	scale.append('text').attr('class', 'scale-title').attr('x', 30).attr('y', 20).attr('font-weight', 'bold').attr("font-family", "Arial")
	.text(dim.scaleValue);
	scale.append('line').attr('x1', 0).attr('y1', 25).attr('x2', dim.scaleLength).attr('y2', 25).attr("stroke-width", 2).attr("stroke", "black");
	scale.append('line').attr('x1', 0).attr('y1', 20).attr('x2', 0).attr('y2', 25).attr("stroke-width", 2).attr("stroke", "black");
	scale.append('line').attr('x1', dim.scaleLength).attr('y1', 20).attr('x2', dim.scaleLength).attr('y2', 25).attr("stroke-width", 2).attr("stroke", "black");
	dim = scale_svg[0][0].getBBox();
	scale_svg.attr("height", 30).attr('width', dim.width+10);
	this.scale_div.height(40).width(dim.width+10);
}


D3BaseTree.prototype.updateLegend = function(title, ordered_groups){
	var self = this;
	d3.select(this.legend_div[0]).select("svg").remove();
	if (title == 'nothing' || ! this.display_category) {
		return;
	}
	var others = 0;
	var legend_data = ordered_groups.filter(function(group) {
		if (group[2] == '') {
			others += group[1];
			return false;
		}
		return true;
	}).map(function(group) {
		return { group: group[0] + '  ['+group[1]+']',
				 group_colour: group[2], 
				 real_group : group[0], 
		};
	});

	if (others) {
		legend_data.push({
			 group:"Others  [" + others + ']',
			 group_colour:this.default_colour, 
			 real_group : 'Others', 
		});
	}
	
	
	var legend_svg= d3.select(this.legend_div[0]).append('svg').attr("id","legend-svg");
	var legend = legend_svg.append("g").attr('class', 'legend');
	var legend_items = legend.selectAll('.legend-item').data(legend_data, function(it){
		return it.group;
	});
	legend_items = legend_items.enter().append('g').attr('class', 'legend-item').attr('transform', function(d, i){
		return "translate(0," + ((i + 1) * 20 + 10) + ")";
	});
	/*
	Create rect elements with group colours
	*/
	legend_items.append('circle').attr('cx', 8).attr('cy',10).attr('r', 8).style('stroke-width', '0.5').style('stroke', 'black').style('fill', function(it){
		return it.group_colour;
	}).on("click",function(data){
		var obj={
			category:self.display_category,
			value:data.group,
			colour:data.group_colour
		};
		self.legendItemClicked(obj)
	
	});
	/*
	Create text elements with group names
	*/
	legend_items.append('text').attr('x', 20).attr('y', 9).attr('dy', ".35em").attr("font-family", "Arial").style('text-anchor', 'start').text(function(it){
		var name = it.group;
		/*if (name.length >25){
			name = name.substring(0,25)+"..."
		}*/
		return name;
	});
	/*
	Update the legend title
	*/
	legend.selectAll('.legend-title').remove();
	legend.append('text').attr('class', 'legend-title').attr('x', 12).attr('y', 20).attr('font-weight', 'bold').attr("font-family", "Arial")
	.text(this.metadata_info[title]['label']);
	var legend_dim = legend_svg[0][0].getBBox();
	legend_svg.attr('width', 300).attr('height', legend_dim.height + 10);
	this.legend_div.width(300);
	var l_height = $("#legend-svg").height();
	var height = l_height+10;
	this.legend_div.css({"max-height":height+"px"});
	this.legend_div.height(height);
};
	
/**
* Sets the colour for a value in a category e.g. setColour("Country","France","blue")
* @param {string} category The name of the field (category)
* @param {string} value The name of the value
* @param {string} colour The colour to set (usual fomration)
 */
D3BaseTree.prototype.setColour=function(category,value,colour){
	var cat = this.custom_colours[category];
	if (!cat){
		cat =this.custom_colours[category]={};	
	}
	cat[value]=colour;
};	


D3BaseTree.prototype.calculateDateScale= function(){
		var arr = []
		for (var strain in this.metadata){
			if (!this.metadata[strain]['Collection Date']){
				this.metadata[strain]['Collection Date']='ND';
			}
			var date  = this.timeFormat.parse(this.metadata[strain]['Collection Date'] )
			arr.push(date);
		}
		var ext = d3.extent(arr);
		var ms_min = Date.parse(ext[0]);
		var ms_max = Date.parse(ext[1]);
		this.min_date = "NA";
		this.max_date='NA'
		if  (ext[0] && ext[1]){
			this.min_date=this.timeFormat(ext[0]);
			this.max_date=this.timeFormat(ext[1]);
			var ms_mid =  ms_min + ((ms_max-ms_min)/2);
			var mid = new Date(ms_mid);
			var st_mid = mid.getFullYear+"-"+(mid.getMonth()+1)+"-"+mid.getDate();
			mid = this.timeFormat.parse(st_mid)
			this.date_scale = d3.time.scale()
			.domain([ext[0],ext[1]])
			.range(["yellow","red"]);
		}
		
};
	
D3BaseTree.prototype._getNodeColour = function(key){
	var strain = this.metadata[key];
	if (!strain){
		return '#ddd'
	}
	var val = strain[this.displayCategory];
	if (!val){
		return '#ddd'
	}
	if (this.displayCategory === 'Collection Date'){
			if (val=== 'ND'){
				return "#ddd"
			}
			return this.date_scale(this.timeFormat.parse(val));
	}
	
	return this.category_colours[val];
};


D3BaseTree.prototype._keyDown= function(e){
	var self = this;
	if (d3.event.shiftKey){
		var brush = this.svg.append("g")
			.datum(function() { 
				return {selected: false, previouslySelected: false}; 
			})
			.attr("class", "brush");      
		var brushX=d3.scale.linear().range([0, this.width]);
		var brushY=d3.scale.linear().range([0, this.height]);
		brush.call(d3.svg.brush()
			.x(this.zoom.x())
			.y(this.zoom.y())
			.on("brushstart",function(){
				$(".extent").css( {stroke:"#fff","fill-opacity":".125","shape-rendering": "crispEdges"});
				self.brushStarted()
			})
			.on("brush", function() {
				var extent = d3.event.target.extent();
				self.brushing(extent);
			})
			.on("brushend", function() {
				var extent = d3.event.target.extent();
				self.brushEnded(extent);
				d3.event.target.clear();
				d3.select(this).call(d3.event.target);

			}));      
	}
	else{
		self.keyPressed(e);
	}
};


/**
* Adds the options available for metadata categories
* @param {object}Can either be  a key to label of metadata categories
* e.g. {collection_data:"Collection date","strain_name":"Name",....}
* or a key to an object containing information about the field
* <ul>
* <li> label the name of the field - required </li>
* <li>coltype - default character </li>
* <li> grouptype - default size </li>
* <li> colorscheme - default category </li>
* <li> cateogory The name of the category to group this field default is none </li>
* </ul>
*/
D3BaseTree.prototype.addMetadataOptions=function(options){
	for (var key in options){
		var value = options[key];
		if ( value !== null && typeof value === 'object'){
			if (!value["coltype"]){
				value['coltype']='character';			
			}
			if (!value["grouptype"]){
				value['grouptype']='size';			
			}
			if(!value["colorscheme"]){
				value['colorscheme']='category';
			}
			if (! value["minnum"]) {
				value['minnum'] = 0;
			}
			
			this.metadata_info[key] =value
		}
		else if (this.metadata_info[key]) {
			delete options[key];
		}
		else{
			this.metadata_info[key]={
				label:options[key],
				coltype : 'character', 
				grouptype : 'size', 
				colorscheme : 'category', 
				minnum : 0, 
			}
		}
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_options_altered",options);	
	}
}



D3BaseTree.prototype.addMetadata=function(metadata){
	var metadata_map = {};
	Object.values(this.metadata).forEach(function(d) {
		metadata_map[d.ID] = d;
	});
	for (var id in metadata){
		var m2 = metadata[id];
		var item = metadata_map[id] ? metadata_map[id] : this.metadata[id];
		var node_id = metadata[id]['ID'];
		
		if (!item){
			if (! node_id){
				m2['ID']=node_id=id;
			}
			//the  node my change if collapsed
			m2["__Node"]=node_id;
			if (! this.metadata_map[node_id]) {
				this.metadata_map[node_id] = [id];
			} else {
				this.metadata_map[node_id].push(id);
			}
			this.metadata[id]=m2;
		} else {
			for (var key in m2){
				item[key]=m2[key];
			}		
		}
	}
	for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("metadata_altered",this);	
	}
};

/**
* Returns all the metadata options as key:value(label) dictionary
* @returns {object} a key to label of metadata categories
* e.g. {collection_data:"Collection date","strain_name":"Name",....}
*/
D3BaseTree.prototype.getMetadataOptions=function(){
	
	return this.metadata_info;
}



/**
* Gets the 
*/

D3BaseTree.prototype.getSVG=function(){
	//attach legend to svg
	//this.legend_div.show();
	if (the_tree.legend_div.css("display") === 'block') {
		var ori_pos = the_tree.legend_div.position();
		var leg = $(".legend");
		$("#mst-svg").append(leg);
		leg.attr("transform","translate("+ori_pos.left+","+ori_pos.top+")");
	}
	if (the_tree.scale_div.css("display") === 'block') {
		var ori_pos = the_tree.scale_div.position();
		var sb = $(".scale-bar");
		$("#mst-svg").append(sb);
		sb.attr("transform","translate("+ori_pos.left+","+ori_pos.top+")");
	}

	var svgData = $("#mst-svg")[0].outerHTML;
	var svgData = ['<svg xmlns="http://www.w3.org/2000/svg" ', svgData.substring(5,9999999)].join('');
	if (the_tree.legend_div.css("display") === 'block') {
		leg.attr("transform","translate(0,0)");
		$("#legend-svg").append(leg);
	}
	if (the_tree.scale_div.css("display") === 'block') {
		sb.attr("transform","translate(0,0)");
		$("#scale-svg").append(sb);
	}

	return svgData;
};

/** Adds a listener to the tree which is called when the tree is altered in some way
* @param {function} callback A callback which is called when the tree is altered
* The function should accept a string which specifies what type of change and
* data which describes the change
* <ul>
* <li> metadata_altered </li>
* <li> nodes_collapsed </li>
* <li> metadata_options_altered - data contains the new metadata options </li>
*/
D3BaseTree.prototype.addTreeChangedListener=function (callback){
	this.treeChangedListeners.push(callback);
}


/** Adds a listener to the tree which is called when nodes are selected/deselected
* @param {function} callback A function which is called when nodes are
* selected, the tree is passed  to the callback
*
*/
D3BaseTree.prototype.addNodesSelectedListener=function (callback){
	this.nodesSelectedListeners.push(callback);
}


/** Adds a listener to the tree which is called when certain display_functions
* are called - 
* @param {function} callback A function which is called when 
*  the display is altered. The function should accept the type and data
* associated with the change
* <ul>
* <li> show_hypothetical_nodes  - boolean whether the nodes are shown</li>
* <li> category_changed - string the new category
* </ul>
*
*/
D3BaseTree.prototype.addDisplayChangedListener=function (callback){
	this.displayChangedListeners.push(callback);
}

D3BaseTree.prototype.keyPressed= function(e){};
D3BaseTree.prototype.brushStarted = function(){};
D3BaseTree.prototype.brushing= function(extent){};
D3BaseTree.prototype.brushEnded= function(extent){};
D3BaseTree.prototype.legendItemClicked= function(obj){};

	
				
