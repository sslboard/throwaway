const fs=require("fs");
const BIT_COUNT=1386920, HASH_COUNT=14;
const data=new Uint8Array(fs.readFileSync("./src/generated/filter.bin"));
function hashPair(value){
  let h1=0xdeadbeef, h2=0x41c6ce57;
  for(let i=0;i<value.length;i++){
    const ch=value.charCodeAt(i);
    h1=Math.imul(h1^ch,2654435761);
    h2=Math.imul(h2^ch,1597334677);
  }
  h1=Math.imul(h1^(h1>>>16),2246822507);
  h1^=Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507);
  h2^=Math.imul(h1^(h2>>>13),3266489909);
  return [h1>>>0,h2>>>0];
}
function has(item){
  const [h1,h2]=hashPair(item);
  for(let i=0;i<HASH_COUNT;i++){
    const hash=(h1+i*h2)>>>0;
    const bit=hash%BIT_COUNT;
    if((data[bit>>>3]&(1<<(bit&7)))===0) return false;
  }
  return true;
}
const legit=["gmail.com","outlook.com","sslboard.com","anthropic.com"];
const candidates=["bbithep.com","tmpbox.net","tmpmail.org","tmpmail.net","tmail.ws","disbox.net","tmpeml.com","tmpbox.me"];
let out="== legit_expect_false ==\n";
for(const d of legit) out+=d.padEnd(22)+" disposable="+has(d)+"\n";
out+="== candidates ==\n";
for(const d of candidates) out+=d.padEnd(22)+" disposable="+has(d)+"\n";
process.stdout.write(out);
