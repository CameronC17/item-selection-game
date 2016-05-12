//Different toolkits for different browsers. If none work, set to null.
var animFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame    || window.oRequestAnimationFrame      || window.msRequestAnimationFrame     || null ;

//Mouse click listener, listens for mouse being pressed down, released and moved
window.addEventListener('mousedown', function(event) { mouseEvent.storeData(event, "down") }, false);
window.addEventListener('mouseup', function(event) { mouseEvent.storeData(event, "up") }, false);
window.addEventListener('mousemove', function(event) { mouseEvent.storeData(event, "move") }, false);

//Creating instances of canvas and the canvas' 2d drawing, allowing us to manipulate it in JS
var c = document.getElementById("canvas");
var ctx = c.getContext("2d");

//Permanent variables ###############################################
//Stores 9 interesting colours
//                     green      red         blue      yellow     purple     orange     lblue       pink      dgreen
var colourPalette = ["#00ff00", "#ff0000", "#0066ff", "#e6e600", "#cc00ff", "#ff6600", "#66ffff", "#ff66ff", "#009900"];

//Stores 3 diffent shapes, with varying edges. if we add another shape with its points, the game will instantly pick it up and use it.
//                 |         TRIANGLE          |                SQUARE               |                RECTANGLE
var shapePoints = [[[25, 0], [50, 50], [0, 50]], [[0, 0], [50, 0], [50, 50], [0, 50]], [[15, 0], [35, 0], [35, 50], [15, 50]]];

//This array holds all 9 positions that the objects can be at. I'm making the locations dynamic...
//... so that the game can be scaled larger or smaller. If this wasn't needed, could just hard-code them
//Format is [x, y]
var objLoc = [[(c.width / 6), (c.height / 6)], [(c.width / 6) + (c.width / 3), (c.height / 6)], [(c.width / 6) + (2 * c.width / 3), (c.height / 6)],
              [(c.width / 6), (c.height / 6) + (c.height / 3)], [(c.width / 6) + (c.width / 3), (c.height / 6) + (c.height / 3)], [(c.width / 6) + (2 * c.width / 3), (c.height / 6) + (c.height / 3)],
              [(c.width / 6), (c.height / 6) + (2 * c.height / 3)], [(c.width / 6) + (c.width / 3), (c.height / 6) + (2 * c.height / 3)], [(c.width / 6) + (2 * c.width / 3), (c.height / 6) + (2 * c.height / 3)]];

//Used to create the jiggle effect when a shape is pressed but not released
var shapeJiggle = [0, 0];

//Var to keep track of the current score the user is on!
var userScore = 0;

//Here we store the current stage of the game. Will be false to start, and true when finished
var gameEnded = false;

//scoreLocation is the position the users score is located at. Using c.width to allow for scaling the canvas size
var scoreLocation = [c.width - 130, 30];

//celebrationTime is the time that the ending has started, and we must play an animation for 8 seconds
var celebrationTime = null;

// 2 arrays to hold balloons - some infront of text, others behind
var balloonsInfront = [];
var balloonsBehind = [];

//Confetti array
var confettiArr = [];

//Creates shape objects to click on, and holds info such as location, colour and rotation. 
var shapes = createShapeSet();

//Here we have the button for if the user wants to restart the game
var restartButton = [(c.width / 2 - 145), (c.height - 150), 300, 50];


//BEGIN GAME LOGIC \/ \/ \/

//Loops through to draw the graphics. this function is called through the recursiveAnim function
function mainLoop() {  
  if (!gameEnded)
  {
    //Game mechanics to do things like rotate the shapes and draw fireworks/confetti
    gameEngine();
    //Draws the visuals on screen. This function splits out in to a few more     
    drawGameScreen();
  }
  else
  {
    drawEndScreen();
  }  
}

function gameEngine() {
  //The mouse down event is used for checking if the user is clicking inside the box, to create a feedback jiggle
  if (mouseEvent.mouseDown[0] != -1 && mouseEvent.mouseDown[1] != -1)
  {
    if (insideShape(mouseEvent.mouseDown[0], mouseEvent.mouseDown[1]))
    {
      shapeJiggle[0] = Math.floor((Math.random() * 3) + 0);
      shapeJiggle[1] = Math.floor((Math.random() * 3) + 0);
    }
  }

  //If the mouse if lifted on a certain shape, it has been clicked on!
  if (mouseEvent.mouseUp[0] != -1 && mouseEvent.mouseUp[1] != -1)
  {
    if (insideShape(mouseEvent.mouseUp[0], mouseEvent.mouseUp[1]))
    {
      //This 'if' is to stop the user from being able to click the falling shape for more points!
      if (!shapes[0].isClickedOn())
        userScore++;
      shapes[0].nowSelected();
    }
  }

  //This checks if the mouse is being hovered over the shape, and provides visible feedback if so
  if (mouseEvent.mousePos[0] != -1 && mouseEvent.mousePos[1] != -1)
  {
    if (insideShape(mouseEvent.mousePos[0], mouseEvent.mousePos[1]))
    {
      shapes[0].rotate(1);
    }
  }

  //Checking to see if the mouse has been clicked on. If so, make the shape fall.
  if (shapes[0].isClickedOn())
    shapes[0].fall();

  //Checking is the shape is on screen. if it isnt, it has fallen out of sight so we can move to the next shape
  if (!shapes[0].onScreen())
    nextShape();

  //Clear only the mouse up event. Mouse down and position remain because they are active events
  mouseEvent.clearData();
}

function nextShape() {
  if (shapes.length > 1)
    shapes.splice(0, 1);
  else
  {
    gameEnded = true;
    celebrationTime = new Date().getTime();
  }
}

function drawGameScreen() {
  //Clears the canvas to ensure all of previous screen has been removed.
  clearScreen();

  //Draws the current shape that is to be clicked
  drawShape();

  //Used to display the users current score ingame
  drawScore();
}

function clearScreen() {
  ctx.fillStyle="#aaff80";
  ctx.fillRect(0, 0, c.width, c.height);
}

function drawShape() {
  //First I get all necessary values before drawing the shape
  var rotateDegree = shapes[0].getRotation();
  var shapePos = shapes[0].getPosition();
  ctx.fillStyle = shapes[0].getColour();

  //Saving the canvas to restore to before canvas was translated + rotated
  ctx.save();
  ctx.translate(shapes[0].getCanvasPos()[0], shapes[0].getCanvasPos()[1]);
  ctx.rotate((Math.PI * 2)/360 * rotateDegree);
  ctx.beginPath();
  //the -25's are to centre the shape around its turning point
  //first, as the shape will always have a starting point we know it is safe to do shapePos[0]. this sets up the start of the canvas drawing
  ctx.moveTo(shapePos[0][0] - 25 + shapeJiggle[0], shapePos[0][1] - 25 + shapeJiggle[0]);
  //because the shape can have a different number of edges, we need to loop through all positions saved in the shape and drawing a line to each one
  for (var i = 1; i < shapePos.length; i++) {
    ctx.lineTo(shapePos[i][0] - 25 + shapeJiggle[0], shapePos[i][1] - 25 + shapeJiggle[0]);
  }
  ctx.fill();
  ctx.restore();
  //Call the rotate function on the object. the reason i pass it a value is because i use the rotate function for more than just here. (see: hover over shapes)
  shapes[0].rotate(0.2);
}

function drawScore() {
  ctx.font = "20px Helvetica";
  ctx.fillStyle="#000";
  
  ctx.fillText("Your score: " + userScore, scoreLocation[0], scoreLocation[1]);
}

function drawEndScreen() {
  //Clears the canvas to ensure all of previous screen has been removed.
  clearScreen();  

  //Here we randomly create balloon objects to celebrate finishing the game!
  createItems();

  //Moves the balloons up, like they are floating :)
  moveBalloons();

  //And dropping the confetti
  moveConfetti();

  //Here are the ballons behind the text
  drawCelebrationBehind();

  //Moves the score text into the center of the screen and holds it there
  moveScore();  

  //Here we draw the animations for winning the game, infront of the text
  drawCelebrationInfront();

  //here we draw the restart button
  drawRestartButton();

  //Clean up balloons here
  removeBalloons();

  //Clean up confetti here
  removeConfetti();

  //Check mouse click to see if restart button is clicked
  checkEndGameClick();
}

function checkEndGameClick() {
  if (mouseEvent.mouseUp[0] != -1 && mouseEvent.mouseUp[1] != -1)
  {
    if (insideCheck(mouseEvent.mouseUp[0], mouseEvent.mouseUp[1]))
      restartGame();
  }

  //Clear only the mouse up event. Mouse down and position remain because they are active events
  mouseEvent.clearData();
}

function restartGame() {
  userScore = 0;
  gameEnded = false;
  celebrationTime = null;
  scoreLocation = [c.width - 130, 30];
  balloonsInfront = [];
  balloonsBehind = [];
  confettiArr = []; 
  shapes = createShapeSet();


}

function insideCheck(mouseX, mouseY) {
  if (mouseX >= restartButton[0] && mouseX <= restartButton[0] + restartButton[2] && mouseY >= restartButton[1] && mouseY <= restartButton[1] + restartButton[3])
    return true;
  return false;
}

function drawRestartButton() {
  ctx.fillStyle="#000099";
  ctx.fillRect(restartButton[0], restartButton[1], restartButton[2], restartButton[3]);
  ctx.fillStyle="#fff";
  ctx.font="30px Helvetica";
  ctx.fillText("RESTART", restartButton[0] + (restartButton[2] / 2 - 70), restartButton[1] + (restartButton[3] / 2 + 12));
}

function removeConfetti() {
  for (var i = 0; i < confettiArr.length; i++)
  {
    //The checkDestroyed functions look to see if the item has reached its maximum point (off screen)
    if (confettiArr[i].checkDestroyed())
    {
      confettiArr.splice(i, 1);
      i--;
    }
  }
}

function removeBalloons() {
  for (var i = 0; i < balloonsInfront.length; i++)
  {
    //The checkDestroyed functions look to see if the item has reached its maximum point (off screen)
    if (balloonsInfront[i].checkDestroyed())
    {
      balloonsInfront.splice(i, 1);
      i--;
    }
  }

  for (var i = 0; i < balloonsBehind.length; i++)
  {
    if (balloonsBehind[i].checkDestroyed())
    {
      balloonsBehind.splice(i, 1);
      i--;
    }
  }
}

function drawCelebrationInfront() {
  for (var i = 0; i < balloonsInfront.length; i++)
  {
    var balPosition = balloonsInfront[i].getPosition(),
        balSize = balloonsInfront[i].getSize();
    ctx.fillStyle=balloonsInfront[i].getColour();
    ctx.save();
    //We use scale to mould the arc (circle) we are drawing into a circle
    ctx.scale(0.75, 1);
    ctx.beginPath();
    ctx.arc(balPosition[0], balPosition[1], balSize, 0, Math.PI*2, false);
    ctx.fill();
    ctx.fillStyle="#000";
    ctx.stroke();
    ctx.closePath();
    //The next 2 lines create the 'string' coming from the balloon
    ctx.fillStyle="#000";
    ctx.fillRect(balPosition[0], balPosition[1] + balSize, 2, 80);
    ctx.restore();
  }

  //And here we draw the confetti. the confetti has rotation so we need to translate the canvas
  for (var i = 0; i < confettiArr.length; i++)
  {
    var confPos = confettiArr[i].getPosition(),
        confRotation = confettiArr[i].getRotation();
    ctx.fillStyle=confettiArr[i].getColour();
    ctx.save();
    ctx.translate(confPos[0], confPos[1]);
    ctx.rotate((Math.PI * 2)/360 * confRotation);
    ctx.fillRect(0, 0, 5, 3);
    ctx.restore();
  }
}

function drawCelebrationBehind() {
  //The same info from drawCelebrationInfront() applies here, however now we are drawing behind the text
  for (var i = 0; i < balloonsBehind.length; i++)
  {
    var balPosition = balloonsBehind[i].getPosition(),
        balSize = balloonsBehind[i].getSize();
    ctx.fillStyle=balloonsBehind[i].getColour();
    ctx.save();
    ctx.scale(0.75, 1);
    ctx.beginPath();
    ctx.arc(balPosition[0], balPosition[1], balSize, 0, Math.PI*2, false);
    ctx.fill();
    ctx.fillStyle="#000";
    ctx.stroke();
    ctx.closePath();
    ctx.fillStyle="#000";
    ctx.fillRect(balPosition[0], balPosition[1] + balSize, 2, 80);
    ctx.restore();
  }
}

function moveBalloons() {
  for (var i = 0; i < balloonsInfront.length; i++)
  {
    balloonsInfront[i].float();
  }

  for (var i = 0; i < balloonsBehind.length; i++)
  {
    balloonsBehind[i].float();
  }
}

function moveConfetti() {
  for (var i = 0; i < confettiArr.length; i++)
  {
    confettiArr[i].fall();
  }
}

function createItems() {
  //Finds out what time we currently are in
  var currentTime = new Date().getTime();

  //Here we check if the current time of the loop is less than the time we finished the game plus 8 seconds (8000 milliseconds)
  if (currentTime < celebrationTime + 8000)
  {
    //There are two arrays of balloons to add to - infront and behind
    var balloonSpawn = Math.floor((Math.random() * 300) + 0);
    if (balloonSpawn == 1)
    {
      balloonsInfront.push(new Balloon);
    }

    balloonSpawn = Math.floor((Math.random() * 100) + 0);
    if (balloonSpawn <= 3)
    {
      balloonsBehind.push(new Balloon);
    }

    //And now to create the confetti...
    if (confettiArr.length < 500)
      confettiArr.push(new Confetti);

  }
}

function moveScore() {
  ctx.fillStyle="#000";
  if (scoreLocation[0] > (c.width / 2 - 120))
    scoreLocation[0] -= 2;
  if (scoreLocation[1] < (c.height / 2) - 100)
    scoreLocation[1] += 2;

  //This is when the font size changes whne the text is almost centered
  if (scoreLocation[0] < c.width - 240)
    ctx.font = "40px Helvetica";

  ctx.fillText("Your score: " + userScore, scoreLocation[0], scoreLocation[1]);

  ctx.font = "50px Helvetica";
  ctx.fillText("Well Done! You finished!", 30, 300);

}

//Creating the shapes with random order and position. Only called once per game
function createShapeSet() {
  var returnArray = [];
  //Slice(0) is used to clone the array, rather than directly modify it
  var tempColourSet = colourPalette.slice(0);
  var tempLocations = objLoc.slice(0);
  for (var i = 0; i < 9; i++)
  {
    //Next 2 lines pick a random colour and location from the arrays I have already defined
    var chosenColour = Math.floor((Math.random() * tempColourSet.length) + 0);
    var chosenLocation = Math.floor((Math.random() * tempLocations.length) + 0);
    
    //Pushes a new shape to the array we will be returning
    returnArray.push(new Shape(tempColourSet[chosenColour], tempLocations[chosenLocation]));

    //Now we remove the chosen colour and location from the temporary arrays we're working with to prevent duplicates
    tempColourSet.splice(chosenColour, 1);
    tempLocations.splice(chosenLocation, 1);
  }
  return returnArray;
}

// THIS FUNCTION IS THE MAIN FUNCTION IN THE GAME, for drawing the graphics at the FPS set by the browser
//This loops the animation frames for creating animation
function recursiveAnim() {
  mainLoop();
  animFrame(recursiveAnim);
};
animFrame(recursiveAnim);




// Functions for saving a mouse click #############################################
// Storing mouse x and y in our array, format [x, y] for mouse events: down, up, move
var mouseEvent = {
  mouseDown : [-1, -1],
  mouseUp : [-1, -1],
  mousePos : [-1, -1],

  storeData: function(e, eventType) {
    pos = getMousePos(e);
    if (insideCanvas(pos.x, pos.y))
    {
      switch (eventType)
      {
        case "down":
          this.mouseDown[0] = pos.x;
          this.mouseDown[1] = pos.y;
          break;
        case "up":
          this.mouseUp[0] = pos.x;
          this.mouseUp[1] = pos.y;
          this.mouseDown = [-1, -1];
          break;
        case "move":
          this.mousePos[0] = pos.x;
          this.mousePos[1] = pos.y;
          break;
      }      
    }    
  },
  clearData: function() {
    this.mouseUp = [-1, -1];
  }

};

function getMousePos(evt) {
  var rect = c.getBoundingClientRect();
  //Return mouse location related to canvas with JSON format
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
};

//Checks if the mouse event is inside the canvas
function insideCanvas(xPos, yPos) {
  if ((xPos >= 0) && (xPos <= c.width) && (yPos >= 0) && (yPos <= c.height))
    return true;
  return false;
};

//Checking if the mouse is inside the boundaries of the shape
function insideShape(mouseX, mouseY) {
  var canvasX = shapes[0].getCanvasPos()[0] - 25,
      canvasY = shapes[0].getCanvasPos()[1] - 25;
  if (mouseX >= canvasX && mouseX <= canvasX + 50 && mouseY >= canvasY && mouseY <= canvasY + 50)
    return true;
  return false;
};

//End mouse click stuff #############################################



//#######################################//
//          Click Shape Class            //
//      Â© CAMERON CHALMERS, 2016         //
//#######################################//

function Shape(colour, position) {
  //Generate a random number between 0 and 2 to pick a random shape to create
  var whatShape = Math.floor((Math.random() * 3) + 0);

  //Set the shape points based on what shape was randomly assigned above
  this.points = shapePoints[whatShape];
  
  this.canvasPos = [position[0] - 25, position[1] - 25];

  //The shape is given its randomly assigned colour
  this.colour = colour;

  //The shapes current degree of rotation, always starting at 0
  this.rotation = 0;

  //Whether the shape has been clicked on. On course, it will always default to being no
  this.selected = false;
}

Shape.prototype.getPosition = function() {
  return this.points;
}

//Finds the most basic x and y of the shape
Shape.prototype.getCanvasPos = function() {
  return this.canvasPos;
}

Shape.prototype.getColour = function() {
  return this.colour;
}

//Finds what degree of rotation we're currently on
Shape.prototype.getRotation = function() {
  return this.rotation;
}

//Rotates the object at a specified degree
Shape.prototype.rotate = function(deg) {
  this.rotation += deg;
}

//Checks if the shape is still visible (needed for when the shape falls off screen)
Shape.prototype.onScreen = function() {
  return (this.canvasPos[1] < c.height + 50);
  //return true;
}

//Checks if the shape has been clicked on already
Shape.prototype.isClickedOn = function() {
  return this.selected;
}

//This will only occur if a user clicks on the shape
Shape.prototype.nowSelected = function() {
  this.selected = true;
}

//Simulates the shape falling, after it has been clicked on
Shape.prototype.fall = function() {
  this.canvasPos[1] += 8;
}


//#######################################//
//          Balloon Class                //
//      Â© CAMERON CHALMERS, 2016         //
//#######################################//

function Balloon() {
  //Picks a random colour from the list of colours
  this.colour = colourPalette[Math.floor((Math.random() * colourPalette.length) + 0)];

  //Set the position of the balloon, with random x between width of canvas, and random y between c height and c height + 100
  this.position = [Math.floor((Math.random() * c.width + 50) + 0), Math.floor((Math.random() * c.height + 100) + c.height)];
  
  //Picks a random speed for the baloon, adding diversity between the ballons (it looks cool)
  this.speed = Math.floor((Math.random() * 4) + 1);

  //Picks a random size between 40 and 80
  this.size = Math.floor((Math.random() * 80) + 40);
}

Balloon.prototype.getPosition = function() {
  return this.position;
}

Balloon.prototype.getSize = function() {
  return this.size;
}

Balloon.prototype.getColour = function() {
  return this.colour;
}

//Checks if the balloon has gone its maximum height, and marks is for deletion
Balloon.prototype.checkDestroyed = function() {
  if (this.position[1] < - 200)
    return true;
  return false;
}

//Floats the balloon upward at its given speed
Balloon.prototype.float = function() {
  this.position[1] -= this.speed;
}



//#######################################//
//          Confetti Class               //
//      Â© CAMERON CHALMERS, 2016         //
//#######################################//

function Confetti() {
  //Picks a random colour from the list of colours
  this.colour = colourPalette[Math.floor((Math.random() * colourPalette.length) + 0)];

  //Set the position of the balloon, with random x between width of canvas, and random y between c height and c height + 100
  this.position = [Math.floor((Math.random() * c.width) + 0), -Math.floor((Math.random() * 100) + 0)];

  //Picks a random speed for the baloon, adding diversity between the ballons (it looks cool)
  this.speed = Math.floor((Math.random() * 3) + 1);

  //Create a random rotation for the confetti
  this.rotation = Math.floor((Math.random() * 360) + 0);
}

Confetti.prototype.getPosition = function() {
  return this.position;
}

Confetti.prototype.getColour = function() {
  return this.colour;
}

Confetti.prototype.getRotation = function() {
  return this.rotation;
}

//Checks if the confetti has fallen beneath the screen
Confetti.prototype.checkDestroyed = function() {
  if (this.position[1] > c.height + 50)
    return true;
  return false;
}

//Drops the confetti at its given speed
Confetti.prototype.fall = function() {
  this.position[1] += this.speed;
}