const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('content/site.js','utf8');
const code=source.slice(source.indexOf('function openTour('),source.indexOf('function openHome('));
for(const webgl of [true,false]){
 const player={dataset:{},innerHTML:'',hidden:true,scrolls:0,scrollIntoView(){this.scrolls++}};
 const ctx=vm.createContext({activeHome:{name:'Test home',tours:[{embed:'https://my.matterport.com/show/?m=verified-example',url:'https://my.matterport.com/show/?m=verified-example',label:'Model tour'}]},$:()=>player,URL,esc:s=>s,icon:()=>'',motion:()=> 'auto',document:{querySelectorAll:()=>[],createElement:()=>({getContext:()=>webgl?{getExtension:()=>null}:null})}});
 vm.runInContext(code,ctx);vm.runInContext('openTour(0,false)',ctx);
 assert.equal(player.hidden,false);assert.equal(player.scrolls,0);
 assert.equal(player.innerHTML.includes('<iframe'),webgl);
 if(webgl)assert.match(player.innerHTML,/play=1/);else assert.match(player.innerHTML,/isn’t available/);
 const original=player.innerHTML;vm.runInContext('openTour(0)',ctx);
 assert.equal(player.innerHTML,original);assert.equal(player.scrolls,1);
 vm.runInContext('openTour(999)',ctx);assert.equal(player.innerHTML,original);
 console.log('PASS automatic tour, scroll preservation, repeat selection, invalid selection, '+(webgl?'embedded autoplay':'3D fallback'));
}
