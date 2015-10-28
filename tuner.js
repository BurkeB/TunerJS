referencetones = [
    ["c", 523],
    ["d", 587],
    ["e", 659],
    ["f", 698],
    ["g", 784],
    ["a", 880],
    ["h", 987]
];

var Tuner = function(canvas){
  this.canvas = canvas;
  this.ctx = canvas.getContext("2d");
  this.concertpitch = 440;
  this.targetTone = "E"
  this.setDimension();
  this.angle = 0;
  this.targetAngle = 0;
  this.distance = 0;
  this.style = {
    'backgroundColor': "#EFEFEF",
    'needleSpotColor': "#FF0000"
  };
}

Tuner.prototype.setDimension = function(){
    this.width = 350;
    this.height = 350;
};

Tuner.prototype.calculateNeedleAngle = function(){
  var Left = 100*(this.targetFrequency/112);
  var Right = 112*(this.targetFrequency/100);
  var angle = 0;
  if(this.distance > 0){
    var relativeDistance = Math.abs(this.distance)/Math.abs(Left - this.targetFrequency);
    if(relativeDistance > 1)
      angle = Math.PI/2;
    else{
      angle = relativeDistance*Math.PI/2;
    }
  }else if(this.distance < 0){
    var relativeDistance = Math.abs(this.distance)/Math.abs(Right - this.targetFrequency);
    if(relativeDistance > 1)
      angle = -Math.PI/2;
    else{
      angle = -relativeDistance*Math.PI/2;
    }
  }else {
    angle = 0;
  }
  this.targetAngle = angle;
}

Tuner.prototype.updateNeedle = function(){
    this.calculateNeedleAngle();
    //console.log("Update Needle ("+this.angle+" / "+this.targetAngle+"): "+Math.sign(this.targetAngle-this.angle)*0.01);
    this.angle += Math.sign(this.targetAngle-this.angle)*0.03 || 0.0;
    if(Math.abs(this.targetAngle - this.angle) < 0.01)
      this.angle = this.targetAngle;
}

Tuner.prototype.drawNeedle = function(position, angle){
  var ctx = this.ctx;

  //Needle Background
  ctx.beginPath();
  ctx.arc(position.x, position.y-10, 150, Math.PI, 0, false);
  ctx.closePath();
  ctx.lineWidth = 1;
  ctx.fillStyle = 'red';
  ctx.strokeStyle = '#550000';
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.moveTo(position.x, position.y-150);
  ctx.lineTo(position.x, position.y-170);
  ctx.stroke();
  ctx.closePath();


  //Needle
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.moveTo(position.x, position.y-10);
  ctx.lineTo(position.x + Math.cos(angle+Math.PI/2)*150, position.y - Math.sin(angle+Math.PI/2)*150);
  ctx.stroke();
  ctx.closePath();

  //Needle Spot
  ctx.beginPath();
  ctx.arc(position.x, position.y-5, 15, Math.PI, 0, false);
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.fillStyle = this.needleSpotColor;
  ctx.fill();
  ctx.strokeStyle = '#550000';
  ctx.stroke();
};

Tuner.prototype.draw = function(){
  var ctx = this.ctx;
  ctx.clearRect(0, 0, this.width, this.height); //RESET
  ctx.beginPath();
  ctx.rect(0, 0, this.width, this.height);
  ctx.fillStyle = this.style.backgroundColor;
  ctx.fill();
  ctx.lineWidth = 0;
  ctx.closePath();
  ctx.fillStyle = "#000000";


  this.angle += 0.01;
  ctx.font = 'italic 40pt Calibri';
  ctx.fillText(this.targetTone, 10, 50);
  ctx.fillText(this.concertpitch, 250, 50);
  var center = {'x': this.width/2, 'y':this.height/2};
  this.drawNeedle({'x':center.x, 'y':this.height},this.angle);
};

Tuner.prototype.tune = function(freqs){
  var tone = "c";
  var distance = "Infinity";
  referencetones.forEach(function(t){
    if(this.fixedTone && t[0] == this.fixedTone)
      return;
    for(var i=1; i <=3; i++){
      if(Math.abs(t[1]*i - freqs[0].frequency) < Math.abs(distance)){
        tone = t[0];
        distance = t[1]*i - freqs[0].frequency;
      }else if(Math.abs(t[1]/i - freqs[0].frequency) < Math.abs(distance)){
        tone = t[0];
        distance = t[1]/ - freqs[0].frequency;
      }
    }
  });
  this.targetTone = (this.fixedTone)?this.fixedTone:tone;
  this.targetFrequency = referencetones.find(function(e){return e[0] == tone;})[1];
  this.distance = -distance;
  console.log(distance);
  this.updateNeedle();
  return {'tone': tone, 'frequency':this.targetFrequency, 'distance': distance};
}
