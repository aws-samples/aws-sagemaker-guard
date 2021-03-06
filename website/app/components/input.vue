<template lang="pug">
  div.input
    div(v-if="schema.type==='string'")
      v-text-field(
        v-if="!schema.enum && !textarea"
        :label="schema.title"
        :hint="schema.description"
        persistent-hint
        :required="required"
        v-model="local"
        :rules='[rules.required,rules.schema]'
        :id='id' :data-vv-name='id'
        :data-path="path"
        @update:error="setValid"
        auto-grow
        :counter="schema.maxLength"
      )
      v-textarea(
        v-if="!schema.enum && textarea"
        :label="schema.title"
        :hint="schema.description"
        persistent-hint
        :required="required"
        v-model="local"
        :rules='[rules.required,rules.schema]'
        :id='id' :data-vv-name='id'
        :textarea="schema.maxLength>'80'"
        :data-path="path"
        @update:error="setValid"
        auto-grow
        :counter="schema.maxLength"
      )
      v-autocomplete(
        v-if="schema.enum"
        :label="schema.title || name"
        :persistent-hint="true"
        :required="required"
        :hint="schema.description"
        :items="schema.enum"
        clearable=true
        v-model="local"
      )
        template(slot="item" slot-scope="data")
          template(v-if="typeof(data.item)==='object'")
            v-list-tile-content
              v-list-tile-title {{data.item.text}}
              v-list-tile-sub-title(v-if="data.item.description") {{data.item.description}}
              v-list-tile-sub-title(v-if="data.item.href") 
                a( :href="data.item.href" target="_blank") view details
          template(v-else)
            v-list-tile-title {{data.item}}
    div(v-if="schema.type==='array'")
      .subheading {{schema.title}}
      span {{schema.description}}
      ul.pl-3
        li(v-for="(item,index) in value" :key="index")
          schema-input(
            :ref="index"
            :schema="schema.items" 
            v-model="value[index]"
            :index="index"
            :required="index===0"
            :name="name"
            :path="path+'['+index+']'"
            style="display:inline-block;width:80%"
            @update:valid="isValid"
          )
          v-btn.primary--text.delete(icon @click.native='remove(index)' 
            :id="path+'-remove-'+index"
            flat
            tabindex='-1')
            v-icon delete
      v-btn.block.primary--text(@click.native='add' tabindex='-1'
        :id="path+'-add'"
        flat
        ) Add Item
      v-btn.block.primary--text(tabindex='-1'
        :href="csvTemplate"
        flat
        ) Download CSV Template
      input( type="file" :id="path+'-file'" @change="upload")
      v-btn.block.primary--text(@click.native='uploadClick' tabindex='-1'
        flat
        ) Upload CSV
      v-btn.block.primary--text(@click.native='clear' tabindex='-1'
        flat
        ) Clear
    div(v-if="schema.type==='object'")
      .subheading {{schema.title}}
      span {{schema.description}}
      ul
        li(v-for="(property,index) in properties" :key="index")
          schema-input(
            :ref="property.name"
            :required="ifRequired(property.name)"
            :schema="property"
            :name="property.name"
            v-model="value[property.name]"
            :path="path+'.'+property.name"
            @update:valid="isValid"
          )
</template>

<script>
/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/
var Ajv=require('ajv')
var ajv=new Ajv()
var empty=require('./empty')
var csv=require('csvtojson')

module.exports={
  props:["schema","value","required","name","index","path","pick","omit"],
  name:'schema-input',
  data:function(){
    var self=this
    return {
      valid:true,
      local:this.schema.default,
      rules:{
        required:function(value){
          return (self.required ? 
            (value && value.trim ? value.trim().length>0 : false) 
            : true)  || "Required"
        },
        schema:function(value){
          var validate=ajv.compile(self.schema || true)
          return !!validate(value) || validate.errors.map(x=>x.message).join('. ')
        }
      }
    }
  },
  components:{},
  watch:{
    local:function(v){
      this.$emit('input',v)
    },
    value:function(v){
      this.local=v
    }
  },
  created:function(){
    if(this.schema.default){
      this.local=this.schema.default
    }
  },
  computed:{
    textarea:function(){
      if(this.schema.type==="string" && !this.schema.enum){
        if(this.schema.maxLength){
          return this.schema.maxLength > 80
        }else{
          return false
        }
      }else{
        return false
      }
    },
    csvTemplate:function(){
      if(this.schema.type==="array"){
        var header=Object.keys(this.schema.items.properties).join(',')
        return `data:application/octet-stream;charset=utf-16le;base64,${btoa(header)}`
      }
    },
    properties:function(){
      var self=this
      if(this.schema.properties){ 
        return Object.keys(this.schema.properties)
        .filter(x=>Object.keys(self.value).includes(x))
        .filter(x=>this.pick ? this.pick.includes(x) : true) 
        .filter(x=>{
          return this.omit ? !this.omit.includes(x) : true
        }) 
        .map(function(x){
          var out=_.cloneDeep(self.schema.properties[x])
          out.name=x
          return out
        })
        .sort((x,y)=>{
          return _.get(y,'propertyOrder',0)-_.get(x,'propertyOrder',0)
        })
      }else{
        []
      }
    },
    validate:function(){
      var r=this.required ? 'required' : ''
      if(this.schema.maxLength){
          r+='|max:'+this.schema.maxLength
      }
      return r
    },
    id:function(){
      return this.index ? `${this.name}-${this.index}` : this.name
    }
  },
  methods:{
    clear:function(){
      this.local=[]
    },
    uploadClick:function(){
      document.getElementById(`${this.path}-file`).click() 
    },
    upload:function(evt){
      var self=this
      this.local=[]
      var files = evt.target.files
      for (var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();
        reader.onload=function(e){
          var text=reader.result

          csv({
            noheader:false,
          })
          .fromString(text)
          .then(obj=>{
            obj.forEach(x=>self.local.push(x))
          })
        }
        reader.readAsText(f)
      }
    },
    remove:function(index){
      this.value.splice(index,1)
    },
    add:function(){
      this.value.push(empty(this.schema.items))
    },
    reset:function(){
      this.local=empty(this.schema)
    },
    ifRequired:function(key){
      return this.schema.required ? this.schema.required.includes(key) : false
    },
    isValid:function(value){
      var tmp=_.flatten(_.values(this.$refs))
        .filter(x=>x.required)
        .map(x=>x.valid)
      
      this.valid=!tmp.includes(false) && value
      this.$emit('update:valid',this.valid)
    },
    setValid:function(value){
      this.valid=!value 
      this.$emit('update:valid',this.valid)
    },
    ask:function(prompt){
      console.log(prompt)
    }
  }
}

</script>

<style lang='scss'>
  .input {
    ul {
      list-style:none;
      
      .delete {
        flex:0;
      }
    }
  }
  input[type=file] { 
    width: 1px; 
    visibility: hidden;
  }
   
  .v-text-field__details {
    margin-left:20px;
  }
  .theme--light.v-label {
    font-weight:800px;
    font-size:1.2em;
  }
  .v-autocomplete__content .v-list__tile__sub-title {
    margin-left:20px;
  }
</style>
