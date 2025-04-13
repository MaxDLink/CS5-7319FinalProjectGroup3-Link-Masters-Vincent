### Selected Architecture: 

EventBus - one constant connection 


Event bus has lower latency which means a better user experience. Features are easier to add because the event bus structure decouples the features. Scalability is easier with event bus 


### Unselected Architecture: 

RESTFUL API - small procedure calls using api gateway. Clunkier than EventBus

RESTFUL architecture has low latency and it is difficult to maintain real time features 



Battleship Game: 

### **Deliverables in Github Repo** 

1) your compilation & implementation platform with the version, where to download 
your implementation platform, how to install and configure the platform; 
2) how to compile your code; 
3) how to execute your system. 
4) Elaborate in detail on the difference between the architecture designs for both 
candidate architecture styles and the rationales for your final selection. 
5) You may change your candidate architecture options in the final deliverables and 
presentation from the project proposal. However, you must explicitly document the 
rationales for your changes to the project proposal in the Readme file. 
6) Other information you think is helpful for the grader to understand the rationales of 
your architecture design decisions. 
[Please ensure the TA/grader can easily compile your code and run/test your 
system.]

In the Readme Word file, you must elaborate in detail on the difference 
between your implementations (e.g., source code, reusable 
components/connectors, etc.) for both candidate architecture styles. 

### [Project Documentation Here](./webapp/notes/architecture.md)

## command to run project

### From the root directory run: cd webapp && npm run build && cd .. && cdk deploy --profile smu  
