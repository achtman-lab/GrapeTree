
        MSFileChooser.prototype = Object.create(null);
        MSFileChooser.prototype.constructor= MSFileChooser;

        function MSFileChooser(filter){
                var self = this;
                this.fileInput = $("<input>").attr("type","file").hide();
                this.callback=null;
                this.fileInput.attr("accept",filter);
                $('<body>').append(this.fileInput);
                this.fileInput.change(function(event){
                        self.callback(event.target.files);

                });

        }
        MSFileChooser.prototype.setFilter=function(filter){
                this.fileInput.attr("accept", filter);
        }
        MSFileChooser.prototype.showOpenDialog=function(callback){
                this.callback=callback;
                this.fileInput.trigger("click");
        }
	function displayErrorMessage(msg){
		Enterobase.modalAlert(msg);
	}

        function MSCSCReader(file,delimiter,callback){
                var reader = new FileReader();
                reader.onload = function(progressEvent){
                        var return_data=[];
                        try{
                                var data =this.result;
                                var lines =  data.split(/\r\n|\r|\n/g);
                                var header = lines[0].split(delimiter);
                                var header_index={}
                                for (var i=0;i<header.length;i++){
                                        header_index[i]=header[i];

                                }

                                for (var i=1;i<lines.length;i++){
                                        var map = {};
                                         var arr = lines[i].split(delimiter);
                                         for (var col in arr){
                                                map[header_index[col]]=arr[col];
                                         }
                                         return_data.push(map);
                                }

                        }catch(error){
                                callback("Error",error.message)

                        }
                        callback("OK",return_data,header_index);
                };
                reader.readAsText(file);
        };

        function saveTextAsFile (text,suggested_name){
                var save = $("<a download><button>Save</button></a>").click(function(){
                        var name=$("#filename").val();
                        if(!name){
                            return;
                        }
                        //windows - don't actually use the file download anchor
                        if(window.navigator.msSaveOrOpenBlob) {
                            var data = new Blob([text], {type: 'text/plain'});
                            window.navigator.msSaveBlob(data,name);
                        }
                        //others
                        else{
                            var data = new Blob([text], {type: 'text/plain'});

                            this.textFile = window.URL.createObjectURL(data);
                            //set file name and contents before click event propogates
                            $(this).attr("download",name);
                            $(this).attr("href",this.textFile);

                        }
                        $(this).parent().dialog().dialog("close");
                });
				
				var notification = "<p style='font-size:10'> Some browsers allow you to select a folder after you click the 'Save' Button.<br><br> Whereas many browsers, such as Chrome, by default save the downloaded file into:<br><b>Windows</b>: <code>'&#92;Users&#92;&lt;username&gt;&#92;Downloads'</code><br><b>Mac</b>: <code>'/Users/&lt;username&gt;/Downloads'</code><br><b>Linux</b>: <code>'home/&lt;username&gt;/Downloads'</code><br><br></p>";
				var filenamebar = $("<input title='Suffix will be automatically added in some browsers if you have got a file with the same name.' type='text' id ='filename' value='"+suggested_name+"'>");
                //the actual dailog box
                $("<div id ='savedailog'></div>")
                .html(notification + "File Name: ")
                .dialog({
                    autoOpen: true,
                    modal: true,
                    title: "Save File",
                    buttons: {
                        "Cancel": function () {
                            $(this).dialog("close");
                        }
                    },
                    close: function () {
                        $(this).dialog('destroy').remove();
                    },
					width: "400px",
                }).append(filenamebar).append(save);
        };

	function getSuffix(name){
		var arr = name.split(".");
		return arr[arr.length-1];

	}
	var var1 = parseInt("{{dhdhdhdh}}");
	var all_files=null;
	var metatdata_file_name;
	var waiting_spinner= null;
	var waitingDialog = null;
	var metadata_categories={};
	var context_menu=null;
	var metadata_grid=null;
	var the_tree = null;
	
	var tree_name="";

	var cannot_connect=false;

	var default_control_panel_values={
		max_link_scale:500,
		base_node_size:10,
		max_link_length:"",
		size_power:0.5,
		log_link_scale:false,
		show_individual_segments:false,
		link_font_size:14,
		show_link_labels:false,
		show_node_labels:true,
		node_font_size:12,
		hide_link_length:"",
		node_collapsed_value:0
	};





        var tooltip_div =d3.select("body")
							.append("div")
							.attr("class", "tooltip")
							.style("opacity", 0)
							.style("z-index", 9)

        var legend_colour_chooser = $("<input>")
                                        .on("change",function(e){
                                                var cc  = $(this);
                                                the_tree.setColour(cc.data("category"),cc.data("value"),cc.val());
                                                the_tree.changeCategory(cc.data("category"));

                                        })
                                        .attr("type","color").hide();

        $("body").append(legend_colour_chooser);

        //a map of group to another map of name to label
	var metadata_options={};
	var new_metadata_fields=[];
	
	var locus_label ="";
	var file_chooser = new MSFileChooser(".nwk");
	var current_metadata_file = null;
	var all_files=null;
	var metadata_file_name = null;



        function downloadMetadata(){
                var lines= [];
                lines.push("Barcode\tName");
                for (var id in the_tree.metadata){
                        var item = the_tree.metadata[id];
                        var barcode = Enterobase.encodeBarcode(id,db_code);
                        lines.push(barcode+"\t"+item["Name"]);
                }
                var text= lines.join("\n");
                Enterobase.showSaveDialog(text,"tree.json");
        }

	//update all the select options
        function addMetadataOptions(options){
		
		for (var value in options){
			var obj =options[value];
			var category = null;
			var label = ""
			if (typeof obj === 'object'){
				label =obj['label'];
				category = obj['category'];
				
			}
			else{
				label=obj;
			}
			var append_to_1 = $("#metadata-select");
			var append_to_2=  $("#node-label-text")
			if (category){
				if (!metadata_categories[category]){
					metadata_categories[category]=true;
					append_to_1 =$("<optgroup>").attr("label",category);
					append_to_2=$("<optgroup>").attr("label",category);
					$("#metadata-select").append(append_to_1);
					$("#node-label-text").append(append_to_2);
				}
				else{
					var to_find = "[label='"+category+"']";
					append_to_1 = $("#metadata-select").find(to_find);
					append_to_2 = $("#node-label-text").find(to_find);
				
				}
			
			}		
			append_to_1.append($("<option>").attr("value",value).text(label));
			append_to_2.append($("<option>").attr("value",value).text(label));
			//$("#add-new-values-select").append($("<option>").attr("value",value).text(label));			
		}	
        }
	
	
	
	
	function deleteMetadataCategory(){
		var category = $("#add-new-values-select").val();
		the_tree.removeCategory(category);
		$("#metadata-select option[value='"+category+"']").remove();
		$("#node-label-text option[value='"+category+"']").remove();
		$("#add-new-values-select option[value='"+category+"']").remove();
		delete metadata_options[category];
	
	}


        function showToolTip(msg, e){
						if (!e) {e=d3.event;}
                        tooltip_div.transition()
							.duration(200)
							.style("opacity", .9);
						tooltip_div.html(msg)
							.style("left", (e.pageX) + "px")
							.style("top", (e.pageY - 28) + "px");
						setTimeout(hideToolTip, 2000);
        }

        function hideToolTip(){
                        tooltip_div.transition()
                        .duration(500)
                        .style("opacity", 0);
        }
	

        function addNewValues(){
                var value = $("#add-new-values-input").val();
                if (! value){
                        return;
                }
                var ids = the_tree.getSelectedIDs();
                var len = ids.length;
                if (len ===0){
                        return;

                }
                var field = $("#add-new-values-select").val();

                var meta = {};
                for (var i in ids){
                        var id = ids[i];
                        var obj={}
                        obj[field]=value;
                        meta[id]=obj;

                }
                the_tree.addMetadata(meta);
                the_tree.changeCategory(field);
		the_tree.clearSelection();
		
        }


        function addExtraField(){
                var name = $("#add-extra-field-input").val();
                if (!name){
                        return;
                }
                addMetadataOptions(name,name);
                $("#metadata-select").val(name);
                $("#add-new-values-select").val(name);
                the_tree.changeCategory(name);
		metadata_grid.updateMetadataTable();
        }

        function treeLoaded(tree){
		//add the extra functionality
		metadata_grid = new D3MSMetadataTable(tree);
		if (tree_id){
			metadata_grid.setAddColumnFunction(function(name){
				addCustomColumn(name);
			})
		}
		context_menu= new D3MSTreeContextMenu(tree,metadata_grid);
		metadata_grid.updateMetadataTable();
		//add the ability to show/hide grid, 
	
		//update the dropdowns if new options added
		tree.addTreeChangedListener(function(type,data){
			if (type === 'metadata_options_altered'){
				addMetadataOptions(data);
			}
			else if (type === 'nodes_collapased'){
				$( "#spinner-collapse-nodes" ).val(data);
				var v = parseFloat(data);
				$("#slider-collapse-nodes").slider('value', Math.log(v)*1000);
			}
		});
		
		tree.addDisplayChangedListener(function(type,data){
			if (type==='category_changed'){
				$("#metadata-select").val(data);
			}
		
		});

		tree.legendItemClicked = function(data){
			legend_colour_chooser
			.css({"left":0,"top":0})
			.val(data.colour)
			.data({"value":data.value.split("  [")[0],"category":data.category})
			.trigger("click");
                };

		$("#spinner-hide-link-length").spinner({
			min: 0,
			max: tree.max_link_distance,
				step:(tree.max_link_distance/1000.0).toPrecision(1)
			});
			$( "#spinner-collapse-nodes" ).spinner({
			min: 0,
			max: tree.max_link_distance,
			value: tree.node_collapsed_value,
			step: 0.000001,
                });

                $( "#slider-collapse-nodes" ).slider({
                        min:Math.log(1e-7)*1000,
                        max: Math.log(tree.max_link_distance+0.01)*1000,
                        value: Math.log(tree.node_collapsed_value)*1000,
                });
                tree.centerGraph();
                for (var index in all_files){
			if (all_files[index].name === metadata_file_name){
				loadMetadataFile(all_files[index],current_metadata_file[1]);
				break;
			}
                }
		$(waiting_spinner.el).hide();
                 $("#waiting-information").text("Complete. Tree has "+tree.force_nodes.length+" nodes");
                 $("#waiting-image").attr("src","static/js/img/ms_complete_1.png").show();
               // legend_colour_chooser.hide();
		$("#information-div").modal("hide");

        }

        function treeLoading(tree,msg){
                if (msg==='complete'){
                        treeLoaded(tree);
                }
                else{

                        $("#waiting-information").text(msg)

                }

        }


        function loadTreeFile(file){
              initiateLoading("Processing "+file.name)
              //give time to dialog to display
              setTimeout(function(){
                        readFile(file,function(tree){
                                 var data={};
								 var suffix = getSuffix(file.name);
                                 if (suffix === 'json'){
                                     data =JSON.parse(tree);
                                 }
                                 else if (tree.substring(0,6)==="#NEXUS"){
                                        data['nexus']=tree;
										data['layout_algorithm']=$("#layout-select").val();
                                 }
                                 else{
                                        data['nwk']=tree;
										data['layout_algorithm']=$("#layout-select").val();
                                 }
								 tree_raw = data;
                                 loadMSTree(tree_raw);
                        });
                },500);
        }

        function readFile(file,callback){
                var reader = new FileReader();
                reader.onload = function(progressEvent){
                        callback(this.result);
                }
                reader.readAsText(file);
        }




        function loadFailed(msg){
		$("#information-div").modal("show");
		$(waiting_spinner.el).hide();
                $("#waiting-image").attr("src","static/js/img/ms_failed_1.png").show();
                $("#waiting-information").text(msg);
        }

	function setControlPanel(data){
		$("#slider-linklength").slider("value",Math.log(data['max_link_scale']/5.)*1000.0);
		$("#spinner-linklength").val(data['max_link_scale']/5.);

		$("#slider-nodesize").slider("value",data['base_node_size']*10);
		$("#spinner-nodesize").val(data['base_node_size']*10);

		if (data['max_link_length']){
			$("#spinner-hide-link-length").val(data['max_link_length']);
			$("#handle-long-branch-hide").prop("checked", true);
		} else if (data['hide_link_length']){
			$("#spinner-hide-link-length").val(data['hide-link-length']);
			$("#handle-long-branch-cap").prop("checked", true);
		}

		if (data['size_power']){
			$("#slider-relative-nodesize").slider("value",data['size_power']*200.0);
			$("#spinner-relative-nodesize").val(data['size_power']*200.0);
		}

		if (data['log_link_scale']){
			$('#link-log-scale').prop('checked', true);
		}
		if (data['show_individual_segments']){
			$("#show-individual-segments").prop("checked",true);
		}
		if (data['link_font_size']){
			$("#slider-linkfontsize").slider("value",data['link_font_size']);
			$("#spinner-linkfontsize").spinner("value",data['link_font_size']);
		}
		var sll =true;
		if (data['show_link_labels']===false){
			sll= false;
		}

		$("#show-link-labels").prop("checked",sll);
		$("#show-node-labels").prop("checked",data['show_node_labels']);
		if (data['node_font_size']){
			$("#slider-node-fontsize").slider("value",data['node_font_size']);
			$("#spinner-node-fontsize").spinner("value",data['node_font_size']);
		}
		var col_value = data['node_collapsed_value']?data['node_collapsed_value']:0;
		$( "#slider-collapse-nodes" ).slider("value",Math.log(col_value)*1000);
		$("#spinner-collapse-nodes").val(col_value);
	}



	function loadMSTree(data){
		metadata_options = {};
		if (the_tree) {
			the_tree.svg.remove();
			the_tree.legend_div[0].remove();
			//resetGridColumns();
			$("#metadata-select").find("option").remove();
			$("#node-label-text").find("option").remove();
			$("#metadata-div").remove();
			$("#context-menu").remove();
		}
		$("#waiting-information").text("Loading Data");
		the_tree = null;
		the_tree = new D3MSTree(
		"graph-div",JSON.parse(JSON.stringify(data)),function(tree,msg){
				treeLoading(tree,msg);

		});
		
		the_tree.addSegmentOverListener(function(d){
				if ($("#show-node-tooltip").prop("checked")){
						var display = d.data.type;
						if (d.data.node_id){
								display = d.data.node_id;
						}
						showToolTip(display+"("+d.data.value+")");
				}
		});
		the_tree.addSegmentOutListener(function(d){
				 hideToolTip();
		});
		the_tree.addLinkOverListener(function(d){
				if ($("#show-link-tooltip").prop("checked")){
						showToolTip("length:"+d.value);
				}

		});
		the_tree.addLinkOutListener(function(d){
				hideToolTip();
		});
		the_tree.resize();
					
					// metadata

		//	  $("#metadata-select").append($("<option>").attr("value",'nothing').text('No Category'));
		//}
		//addMetadataOptions('ID','ID');
		// the_tree.addMetadataOptions({'nothing': 'No Category'});

		if (the_tree.metadata_info){
				addMetadataOptions(the_tree.metadata_info);
		}
		$("#metadata-select").val('nothing');
		$("#node-label-text").val('ID');
		
		if (data['initial_category']){
			$("#metadata-select").val(data['initial_category']);
		}
		if (data['layout_data'] && data['layout_data']['nodes_links']){
			setControlPanel(data['layout_data']['nodes_links'])
		}
		else{
			setControlPanel(default_control_panel_values);
		}
		if (current_metadata_file) {
			loadMetadataFile(current_metadata_file[0], current_metadata_file[1]);
		} else {
			//updateMetadataTable();
		}
		$("#rotation-icon").draggable({
		  containment: "#sidebar",
		  scroll: false,
		  start: function(e) {
			the_tree._dragStarted(the_tree.force_nodes[0], [$("#rotation-icon").position().left, $("#rotation-icon").position().top]);
		  },
		  drag: function(e) {
			the_tree._dragging(the_tree.force_nodes[0], [e.clientX, e.clientY]);
		  },
		  stop: function(e) {
			the_tree._dragEnded(the_tree.force_nodes[0], [e.clientX, e.clientY]);
		  },
		  revert: true,
		  revertDuration: 10,
		  helper: function() {return $("<div style='cursor:none'><label id='angle-text'></label></div>")},
		});
		$("#rotation-icon").on("drag", function(event, ui) {
			var x_dif = ui.helper.position().left - $("#rotation-icon").position().left;
			var y_dif = $("#rotation-icon").position().top - ui.helper.position().top;
			var angle = y_dif !== 0 ? Math.atan(x_dif/y_dif)/Math.PI * 180 : (x_dif === 0 ? 0 : (x_dif > 0 ? 90 : -90));
			if (y_dif < 0 ) {
				angle = 180 + angle;
			} else if (x_dif < 0) {
				angle = 360 + angle;
			}
			ui.helper.select('.angle-text').text(Math.round(angle) + '\xB0').css({
				'font-size':'1.2em',
				'font-style':'bold',
			}) ;

		});

		$('.panel-default').find('input, textarea, button, select, div, span').css("opacity", 1.0).prop('disabled',false);
	}

var current_metadata_file=null;
 function filesDropped(files){
	current_metadata_file=null;
	var tree_file=null, profile_file =null;
	for (var i=0;i<files.length;i++){
		var file = files[i];
		var first_blob = file.slice(0, 2048);
		var reader = new FileReader();
		reader.onload = function(progressEvent){
			var head_line = this.result.split(/[\n\r]/)[0];

			if ((head_line.startsWith(">")  || (head_line.startsWith("#")) && ! head_line.startsWith("#NEXUS") && !head_line.startsWith("#nexus"))) {
				if (cannot_connect){
					loadFailed("Cannot Connect to the backend server");
					return;
				}
				profile_file=this.file;
				initiateLoading("Reading Profile File");
				$("#param-panel").show();
				$("#modal-ok-button").data("profile_file",profile_file);
				$("#modal-ok-button").html("OK");
				$(waiting_spinner.el).hide();
				$("#modal-title").show().text("Parameters For Tree Creation");
				$("#waiting-information").hide();
				$("#headertag").text(this.file.name);
			}

			else if ((head_line.indexOf(",") >=0 || head_line.indexOf("\t")>=0) && !head_line.startsWith("(") && !head_line.startsWith("{")) {
				var dl = (head_line.indexOf(",") >= 0 ? "," : "\t");
				current_metadata_file=[this.file, dl];
				metadata_file_name = this.file.name;
				if (the_tree) loadMetadataFile(current_metadata_file[0], current_metadata_file[1]);
			}
			else {
				tree_file = this.file;
				loadTreeFile(tree_file);
				document.getElementById("headertag").innerHTML = this.file.name;
			}
		};
		reader.file = file;
		reader.readAsText(first_blob);
	}
 }

 function initiateLoading(msg){
	$("#welcome-div-close").show();
	$("#welcome-div").draggable().css({position:'relative', border:'1px solid black', margin:'10px', 'z-index':9999}).hide();
	$("#graph-div").empty();
	$("#metadata-select").empty();
	$("#add-new-values-select").empty();
	metadata_options={};
	showWaitingDialog(msg);
 }

function showModalForParams(){
	$("#information-div").modal("show");
	$("#param-panel").show();
}

tree_raw = {};
 function processProfileFile(profile_file){

        readFile(profile_file,function(profile){
              try{
                $.ajax({
                        method: "POST",
                        url: "/maketree",
                        data: {
						profile:profile,
						method:$("#method-select").val(),
				}
                }).done(function(result){
                		tree_raw = {"nwk":result,"layout_algorithm":$("#layout-select").val()};
						$("#headertag").text( $("#headertag").text() + ' (' + $("#method-select").val() + ')' );
						loadMSTree(tree_raw);
               }).fail(function( jqXHR, textStatus){
						if (jqXHR.status == 405 || jqXHR.status == 404) {
							loadFailed("Cannot reach the backend. Please download a FREE standalone version from https://github.com/achtman-lab/GrapeTree/");
						} else {
							console.log(textStatus);
							loadFailed("There server returned an error. Is the profile file in the right format");
						}
               });
               }catch(e){
                        loadFailed("The server could not be contacted");
               }
                $("#waiting-information").text("Computing Tree");
        });
 };

 function showWaitingDialog(msg){
	$("#information-div").modal("show");
	$("#waiting-image").hide();
	$(waiting_spinner.el).show();
	$("#waiting-information").text(msg).show();
 }


 function loadMetadataFile(file, dl){
	MSCSCReader(file,dl,function(msg,lines,header_index){
		var meta={};
		id_name = header_index[0];
		for (var i in lines){
			var line = lines[i];
			meta[line[id_name]]=line;
		}

		var category = 'nothing';
		var options={};
		category = header_index.length > 1 ? header_index[1] : header_index[0];
		for (var i in header_index){
			var header = header_index[i];
			options[header]=header;
		}
		the_tree.addMetadataOptions(options);
		$("#metadata-select").val(category);
		the_tree.addMetadata(meta);
		the_tree.changeCategory(category);
	});
 };
 
 


window.onload = function (){
	$("#mst-svg-x").on('click', function(e) {
		context_menu._trigger_context("mst-svg", e);
	});
	$("#myGrid-x").on("click", function(e) {
		context_menu._trigger_context("myGrid", e);
	});
	$("#legend-svg-x").on("click", function(e) {
		context_menu._trigger_context("legend-svg", e);
	});

	$(".show-tooltip").on('mouseenter', function(e){
		showToolTip($(this).attr('title'), {
			pageX:$(this).offset().left + $(this).width() + 10, 
			pageY:$(this).offset().top + $(this).height()/2+10
		});
	}).on('mouseleave', function(e) {
		setTimeout(hideToolTip, 200);
	});

        //allow dragging and dropping files
        $("#graph-div").on('dragover',function(e) {
                e.preventDefault();
                e.stopPropagation();
            }
        )
        .on('dragenter',function(e) {
                e.preventDefault();
                e.stopPropagation();
                }
        )
        .on("drop",function(e){
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                var files = e.originalEvent.dataTransfer.files;
                filesDropped(files);
        });
		
		$(".render-method").on("change", function(e) {
			if (this.value == 'static') {
				the_tree.fixAllNodes( document.getElementById("correct_link_length").checked );
			} else if (this.value == 'automatic') {
				the_tree.unfixSelectedNodes(! $("#render-selected-only").is(":checked"));
			}
		});
		$("#handle-long-branch-display, #handle-long-branch-hide, #handle-long-branch-cap").on("change", function(e) {
			var max = $("#spinner-hide-link-length").val();
			if (!max) {
				max = the_tree.max_link_distance+1;
			}
			if (this.value == 'hide') {
				the_tree.setMaxLinkLength(the_tree.max_link_distance+1);
				the_tree.setHideLinkLength(max);
			} else if (this.value == 'cap') {
				the_tree.setHideLinkLength(the_tree.max_link_distance+1);
				the_tree.setMaxLinkLength(max);
			} else {
				the_tree.setMaxLinkLength(the_tree.max_link_distance+1);
				the_tree.setHideLinkLength(the_tree.max_link_distance+1);
			}
		});
		$("#spinner-hide-link-length").on('change', function(e) {
			var max = $("#spinner-hide-link-length").val();
			if (!max) {
				max = the_tree.max_link_distance+1;
			}
			var method = null;
			if ($("#handle-long-branch-hide").prop("checked")) {
				method = 'hide';
			} else if ($("#handle-long-branch-cap").prop("checked")) {
				method = 'cap';
			}
			if (method == 'hide') {
				the_tree.setMaxLinkLength(the_tree.max_link_distance+1);
				the_tree.setHideLinkLength(max);
			} else if (method == 'cap') {
				the_tree.setHideLinkLength(the_tree.max_link_distance+1);
				the_tree.setMaxLinkLength(max);
			}
		});

        $("#upload-metadata-icon").click(function(e){
                if (!metadata_options['Custom Fields']){
                        Enterobase.modalAlert("Please add a custom field before uplaoding a file containing values for this field");
                        return;
                }
                var i = Enterobase.makeCustomFileInput("fileupload",function(file){
                        uploadMetadata(file);
                });
                i.trigger("click");
        });

        $("#metadata-select").on("change",function(e){
                the_tree.changeCategory($(this).val());
        });
        $("#node-label-text").change(function(e){
               the_tree.setNodeText($(this).val());
        });

        /*$(window).resize(function(){
                var winh = ($(window).height())-15;
                var winw = ($(window).width());
                var div  = $("#graph-div");
                var sb_width = $("#sidebar").width();
		  var sb_height = $("#sidebar").height();
		  if (sb_height>winh){
			winh=sb_height;
		  }
                div.height(winh).css({"max-height":winh+"px","min-height":winh+"px"});
                $("#graph-div").width(winw-sb_width);
        });
        $(window).trigger("resize");*/


        $("#mst-download-svg").click(function(e){
                var svg = the_tree.getSVG();
		saveTextAsFile(svg,"MSTree.svg");
        });


       
        $(".panel-body").hide();

        $( "#slider-linklength" ).on("change", function(e) {
					var brlen = Math.exp($(this).slider("value")/1000.0);
					$("#spinner-linklength").spinner('value', brlen);
		})
		.slider({
                orientation: "horizontal",
                min: 1609,
                max: 9903,
                value: 4605,
        });
		
		$("#spinner-linklength").on("change", function (e){
				var brlen = parseInt($(this).val());
				$( "#slider-linklength" ).slider('value', Math.log(brlen)*1000.0);
				the_tree.setLinkLength(brlen*5.0);
		})
		.spinner({
			min: 5,
			max: 20000,
			value: 100,
			step: 1,
		});
		$(".slider-class").slider({
			slide: function(e) {
				$(this).trigger('change');
			},
			change: function(e) {
				if (e.originalEvent) {
					$(this).trigger('change');
				}
			}
		});
		$(".spin-group").spinner({
			spin: function(e, ui) {
				$(this).spinner("value", ui.value);
			},
			change: function(e) {
				$(this).trigger('change');
			}
		}).keypress(function(e){
			if (e.which === 13) {
				$(this).spinner("value", $(this).val());
			}
		});

        $( "#slider-nodesize" ).on("change", function(e) {
			$( "#spinner-nodesize" ).spinner("value", $(this).slider("value"));
		})
		.slider({
                orientation: "horizontal",
                min:20,
                max:500,
                value: 100,
        });
        $( "#spinner-nodesize" ).on('change', function(){
						the_tree.setNodeSize(parseInt($(this).val())/10.);
						$( "#slider-nodesize" ).slider("value", parseInt($(this).val()));
					})
		.spinner({
                min:20,
                max:500,
                value: 100,
        });


        $( "#slider-relative-nodesize" ).on("change", function(e) {
			$( "#spinner-relative-nodesize" ).spinner("value", $(this).slider("value"));
		})
		.slider({
                orientation: "horizontal",
                min:30,
                max:150,
                value: 100,
                step:1,
        })
		$( "#spinner-relative-nodesize" ).on("change", function(e){
			the_tree.setRelativeNodeSize(parseInt($(this).val())/200.0);
			$( "#slider-relative-nodesize" ).slider("value", parseInt($(this).val()));
		})
		.spinner({
                min:30,
                max:150,
                value: 100,
                step:1,
        });

        $( "#slider-node-fontsize" ).on("change", function(e) {
			$("#spinner-node-fontsize").spinner('value', $(this).slider("value"));
		})
		.slider({
                orientation: "horizontal",
                min:6,
                max: 30,
                value: 12,
        });
		$("#spinner-node-fontsize").on("change", function(e) {
				$( "#slider-node-fontsize" ).slider('value', parseInt($(this).val()));
				the_tree.setNodeFontSize(parseInt($(this).val()));
		})
		.spinner({
			min: 6,
			max: 30,
			value: 12,
		});

        $( "#slider-linkfontsize" ).on("change", function(e) {
			$("#spinner-linkfontsize").spinner('value', $("#slider-linkfontsize").slider("value"));
		})
		.slider({
                orientation: "horizontal",
                min:6,
                max: 30,
                value: 14,
        });
		$("#spinner-linkfontsize").on("change", function(e) {
				$( "#slider-linkfontsize" ).slider('value', parseInt($(this).val()));
				the_tree.setLinkFontSize(parseInt($(this).val()));
		})
		.spinner({
			min: 6,
			max: 30,
			value: 14,
		});


        $( "#slider-charge" ).on("change", function(e) {
        	the_tree.alterCharge($("#slider-charge").slider("value"));
			$(this).prop("title", $(this).slider("value"));
		})
		.slider({
			orientation: "horizontal",
			min:0,
			max: 30,
        });

        $("#node-label-text").change(function(e){
                var val = $(this).val();
                if (val ==="cat"){
                        val = the_tree.display_category;
                }
                the_tree.setNodeText(val);
        });


        $("#button-refresh").click(function(){
		showWaitingDialog("Refreshing The Tree");
		setTimeout(function(){
			the_tree.refreshGraph();
			$("#information-div").modal("hide");
		},500)

        });
        $("#show-link-labels").click(function(e){
                the_tree.showLinkLabels($(this).is(":checked"))
        });
        $("#show-node-labels").click(function(e){
                the_tree.showNodeLabels($(this).is(":checked"));
        });
        $("#show-individual-segments").click(function(e){
                the_tree.showIndividualSegments($(this).is(":checked"));
        });

        $("#show-node-tooltip").click(function(e){
                show_node_tooltips = $(this).is(":checked");
        });

        $("#link-log-scale").click(function(e){
                the_tree.setLogLinkScale($(this).is(":checked"));
        });

        $("#button-load-nwk").click(function(e){
                file_chooser.setFilter("");
                file_chooser.showOpenDialog(function(files){
                        filesDropped(files);

                });
        });

          $("#button-load-meta").click(function(e){
                file_chooser.setFilter(".txt,.csv");
                file_chooser.showOpenDialog(function(files){
                        filesDropped(files);
                });
        });

         $( "#slider-collapse-nodes" ).on("change", function(e) {
			var val = Math.exp($(this).slider('value')/1000);
			$("#spinner-collapse-nodes").spinner('value', val);
		 })
		 .slider({
			orientation: "horizontal",
			min:0,
			max: 100,
			value: 0,
        });

	$( "#spinner-collapse-nodes" ).on("change", function(e) {
		var v = parseFloat($(this).spinner('value'));
		if (v != $(this).data.v) {
			$(this).data.v = v;
			$("#slider-collapse-nodes").slider('value', Math.log(v)*1000);
			the_tree.collapseNodes(v);
		}
	})
	.spinner({
		min:0,
		value: 0
	});

	$("#save-tree-json").click(function(e){
			var obj= the_tree.getTreeAsObject();
			saveTextAsFile(JSON.stringify(obj),"ms_tree.json");
	});

	$("#save-tree-nwk").click(function(e){
			var newick= the_tree.getTreeAsNewick();
			saveTextAsFile(newick,"ms_tree.nwk");
	});


	$("#center-graph-button").click(function(e){
		 the_tree.centerGraph();

	});

	$("#search-metadata-icon").click(function(e){
		var keyword= $("#search-metadata-input").val();
		if (!keyword){
			return;
		}
		var ids = the_tree.searchMetadata(keyword, $("#node-label-text").val());
		the_tree.highlightNodes(ids);
	});

	$("#modal-ok-button").click(function(e){
		var profile_file =  $(this).data("profile_file")
		if (profile_file){
			processProfileFile(profile_file);
			$(this).data("profile_file",null);
			$("#modal-oj-button").html("Close");
			$("#param-panel").hide();
			e.stopImmediatePropagation();
			$("#modal-title").hide();
			showWaitingDialog("Processing Profiles");
		}
	});

        $("#method-select").change(function(e) {
			if ($(this).val() == "MSTree") $("#MST-option").show();
			else $("#MST-option").hide();
		})

        $("#matrix-select").change(function(e) {
			if ($(this).val() == "symmetric") $("#symmetric-option").show();
			else $("#symmetric-option").hide();
		})

		$("#graph-div").on('dblclick', function(e){
		    if (the_tree) the_tree.clearSelection();
       })
	try_backend();
	var target = $('#modal-header')
	waiting_spinner= new Spinner({color:'black', lines: 12,top:"13%"}).spin(target);


	$('.panel-default').find('input, textarea, button, select, span, div').css("opacity", 0.3).prop('disabled',true);
	if (! tree_id){
		$("#file-menu-panel").css("opacity", 1.0).addClass("open-menu-panel").show();
		$("#button-load-nwk").parent().css('opacity', 1.0);
		$("#button-load-nwk").css("opacity", 1.0).prop("disabled", false).trigger('mouseenter');
	}

	window.addEventListener("beforeunload", function (e) {
		if (the_tree) {
			var confirmationMessage = 'All the modifications will lost if you have not saved the GrapeTree as a local file.';
			(e || window.event).returnValue = confirmationMessage;
			return confirmationMessage;
		}
	});
	if (tree_id){
		setupEnterobasePanel();
		initiateLoading("Waiting");
		getRemoteData();
	}
	 $(".mst-menu-title").click(function(e){
				if($(this).prop("disabled") === true) {
					return;
				}
		var id = $(this).attr("id");
		var this_panel =  $("#"+id+"-panel");
		var icon = $("#"+id+"-icon");
		if  (this_panel.hasClass("open-menu-panel")){
			this_panel.toggle("50");
			this_panel.removeClass("open-menu-panel");
			icon.attr("class","glyphicon glyphicon-menu-right");
		}
		else{
			this_panel.toggle("50");
			this_panel.addClass("open-menu-panel");
			icon.attr("class","glyphicon glyphicon-menu-down");
			
		}
		/*setTimeout(function(){
			   $(window).trigger("resize");
		},300);*/

	});
	
};

function try_backend(){
  try{
	$.ajax({
			method: "POST",
			url: "/maketree",
	}).done(function(result){})
	.fail(function( jqXHR, textStatus){
		if (jqXHR.status != 406) {
			cannot_connect=true;
		}
    });
   }catch(e){
		cannot_connect=true;
   }
 };
