//=============================================================================
//LudoSavePathing.js
//=============================================================================

/*:
 * @plugindesc plugin that tracks movement of the player when entering a given map and outputs that information to a file.
 * @author Alessio De Santis
 *
 * @help Use <Track:true> on Map metadata to enable tracking.
 * @param Default SwitchId
 * @desc Number of the switch that will trigger the file output when turned on for the first time
 * 
 * Default : 20
 * @default 20
 * 
 * @param Max Saves
 * @desc Max number of Saves allowed per game
 * Default : 1
 * @default 1
 * 
 * @param Save on Title Screen
 * @desc Set to true to automatically save on title screen, false otherwise (lowercase true)
 * Default : true
 * @default true
 */   
 

 //-----------------------------------------------------------------------------

 // Scene_Map_Pathing_Check
//
// 

$testing = [];
$defaultSwitchId = Number(PluginManager.parameters("LudoSavePathing")["Default SwitchId"]) || 20;
$msaves = Number(PluginManager.parameters("LudoSavePathing")["Max Saves"]) || 1;
$titlesave = (PluginManager.parameters("LudoSavePathing")["Save on Title Screen"] == "true");

Scene_Map.prototype.onMapLoaded = function() {
    if (this._transfer) {
        $gamePlayer.performTransfer();
    }
    this.createDisplayObjects();
};

//=============================================================================
// Collecting Pathing Information
//=============================================================================
Game_Player.prototype.increaseSteps = function() {
    Game_Character.prototype.increaseSteps.call(this);
    if (this.isNormal()) {
        $gameParty.increaseSteps();
        if($msaves > 0 && $dataMap.meta.Track){
        $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Path", this._x, this._y]);
        }
    }
};

//=============================================================================
// Collects All EVent Info
//=============================================================================
Game_Player.prototype.startMapEvent = function(x, y, triggers, normal) {
    if (!$gameMap.isEventRunning()) {
        $gameMap.eventsXy(x, y).forEach(function(event) {
            if (event.isTriggerIn(triggers) && event.isNormalPriority() === normal) {
                event.start();
                $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Event_Start",event.event().name]);
                }
        });
    }
};
//=============================================================================
// Battle Start and Stop Times
//=============================================================================
BattleManager.setup = function(troopId, canEscape, canLose) {
    this.initMembers();
    this._canEscape = canEscape;
    this._canLose = canLose;
    $gameTroop.setup(troopId);
    $gameScreen.onBattleStart();
    $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Battle_Start",troopId]);
    this.makeEscapeRatio();
};

BattleManager.endBattle = function(result) {
    this._phase = 'battleEnd';
   	if (this._eventCallback) {
        this._eventCallback(result);
    }
    if (result === 0) {
        $gameSystem.onBattleWin();
    } else if (this._escaped) {
        $gameSystem.onBattleEscape();
    }
    $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Battle_End", result]);
};

//=============================================================================
// All Text Info and Choices (n = choices, 0 is first choice)
//=============================================================================
Game_Message.prototype.allText = function() {
    $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Text", this._texts]);
    return this._texts.join('\n');
};

Game_Message.prototype.onChoice = function(n) {
    if (this._choiceCallback) {
        this._choiceCallback(n);
        $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(),"Respond", this._choices,n]);
        this._choiceCallback = null;
        }
};

//=============================================================================
// Timestamps for Accessing Menu
//=============================================================================



//=============================================================================
// Timestamps for Using Items
//=============================================================================

Scene_ItemBase.prototype.useItem = function() {
    this.playSeForItem();
    this.user().useItem(this.item());
    $testing.filter(function(test){ return test.id === $gameMap._mapId })[0].pathing.push([$gameSystem.playtimeText(), "Use_Item" ,this.item().name]);
    this.applyItem();
    this.checkCommonEvent();
    this.checkGameover();
    this._actorWindow.refresh();
};
//=============================================================================
// Map Transfer Info
//=============================================================================

Game_Player.prototype.performTransfer = function() {
    if (this.isTransferring()) {
        this.setDirection(this._newDirection);
        if (this._newMapId !== $gameMap.mapId() || this._needsMapReload) {
            $gameMap.setup(this._newMapId);
            this._needsMapReload = false;
        }
        this.locate(this._newX, this._newY);
        if($dataMap.meta.Track && $msaves > 0){
            console.log("runs");
            var Ludoexample = $testing.filter(function(test){ return test.id === $gameMap._mapId });
            if(Ludoexample.length == 0){
            var b = {
                id : this._newMapId,
                pathing : [[$gameSystem.playtimeText(), "Transfer", this._newX,this._newY]],
            }
            $testing.push(b);
            }
            else Ludoexample[0].pathing.push([$gameSystem.playtimeText(), "Transfer", this._newX, this._newY]);
        }
        
        this.refresh();
        this.clearTransferInfo();
    }
};


Game_Switches.prototype.onChange = function() {
    $gameMap.requestRefresh();
    Game_Switches.saveFile(this._data[$defaultSwitchId]);
};

Game_Switches.saveFile = function(sw) {
    if($msaves > 0 && sw){
        console.log("Outputting file");
        json = "";
        $testing.forEach(function(element){
            json += "{\n";
           	json += "\t" + '"Map_id" : "' + element.id + '",\n';
            json += "{\t" + '"Pathing" : ' + '[\n';
            element.pathing.forEach(function(array){
               if(element.pathing.indexOf(array) == element.pathing.length-1){
                    json += "\t\t[" + '"' + array[0] + '"' + ", " + array[1] + ", " + array[2] + "," + array[3] + "]";
               }
                else json += "\t\t[" + '"' + array[0] + '"' + ", " + array[1] + ", " + array[2] + "," + array[3] + "],\n"; 
            });
            json += '\n\t]\n';
            json += "}";
            json += "\n";
        });

        StorageManager.saveToTestFile(json); 

        $msaves--;
    }
}

StorageManager.saveToTestFile = function(json) {
    var fs = require('fs');
    var dirPath = this.localFileDirectoryPath();
    var ref = Number(PluginManager.parameters("LudoSavePathing")["Max Saves"]) - $msaves + 1;
    var filePath = this.localFileDirectoryPath() + "test" + ref + ".txt";
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
    fs.writeFileSync(filePath, json);
};

Scene_GameEnd.prototype.commandToTitle = function() {    
    if($titlesave) Game_Switches.saveFile(true);  
    Scene_GameEnd.clearTrackInfo();  
    this.fadeOutAll();
    SceneManager.goto(Scene_Title);
};

Scene_Gameover.prototype.gotoTitle = function() {
    if($titlesave) Game_Switches.saveFile(true);  
    Scene_GameEndne.clearTrackInfo();      
    SceneManager.goto(Scene_Title);
};

Scene_GameEnd.clearTrackInfo = function(){
    for(var i of $testing){
        i.pathing = [];
    }
}