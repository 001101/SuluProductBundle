define(["config"],function(a){"use strict";var b=function(a){a?this.sandbox.emit("sulu.header.toolbar.item.enable","save",!1):this.sandbox.emit("sulu.header.toolbar.item.disable","save",!0)},c=function(){this.sandbox.on("sulu.toolbar.delete",d.bind(this,this.productId)),this.sandbox.once("husky.toolbar.header.initialized",f.bind(this,this.status)),this.sandbox.off("product.state.change"),this.sandbox.on("product.state.change",e.bind(this))},d=function(a){this.sandbox.emit("sulu.product.delete",a)},e=function(a){this.status.id!==a.id&&(this.status=a,b.call(this,!0),f.call(this,a))},f=function(b){var c,d=this.sandbox.translate(a.get("product.status.inactive").key),e="husky-test";b&&b.id!==a.get("product.status.active").id||(d=this.sandbox.translate(a.get("product.status.active").key),e="husky-publish"),c={title:d,icon:e},this.sandbox.emit("sulu.header.toolbar.button.set","productWorkflow",c)};return{initToolbar:function(a,b,d){this.sandbox=a,this.status=b,this.initialStatus=b,this.productId=d,c.call(this,b),f.call(this,b)},getSelectedStatus:function(){return this.status},retrieveChangedStatus:function(){return this.initialStatus!==this.status?this.status:!1},setSaveButton:function(a){b.call(this,a)}}});