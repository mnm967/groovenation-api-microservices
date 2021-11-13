require('../constants/strings');
const otpGenerator = require('otp-generator')
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const https = require('https');
const { INVALID_PURCHASE_REFERENCE, TRANSACTION_NOT_SUCCESSFUL } = require('../constants/strings');
const { Types } = require('mongoose');

function returnUnknownError(res){
    res.json({
        status: -1,
        result: 'unknown_error'
    });
}

function returnTickets(res, tickets){
    var ticketList = []

    tickets.forEach(ticket => {
        ticketList.push({
            "ticketID" : ticket._id,
            "eventID" : ticket.event._id,
            "eventName" : ticket.event.title,
            "imageUrl" : ticket.event.imageUrl,
            "clubName" : ticket.club.name,
            "clubLatitude" : ticket.club.location.coordinates[1],
            "clubLongitude" : ticket.club.location.coordinates[0],
            "startDate" : ticket.event.startDate.toISOString(),
            "endDate" : ticket.event.endDate.toISOString(),
            "ticketType" : ticket.ticketType,
            "noOfPeople" : ticket.noOfPeople,
            "totalCost" : ticket.totalCost,
            "encryptedQRTag" : ticket.qrTag,
            "isScanned" : ticket.isScanned
        })
    })

    res.json({
        status: 1,
        tickets: ticketList
    });
}

function returnTicketPrices(res, ticketTypes){
    var ticketTypesList = []
    ticketTypes.forEach(e => {
        ticketTypesList.push(
            {
                "ticketType" : e.ticketType,
                "ticketPrice" : e.ticketPrice,
                "numTicketsAvailable" : e.numTicketsAvailable,
            }
        )
    })

    res.json({
        status: 1,
        ticket_prices: ticketTypesList
    });
}

function returnVerifyTicketResponse(res, result){
    res.json({
        status: 1,
        result: result
    });
}

function returnVerifyTicketResult(res, ticket){
    var TICKET = {
        "ticketID" : ticket._id,
        "eventID" : ticket.event._id,
        "eventName" : ticket.event.title,
        "imageUrl" : ticket.event.imageUrl,
        "clubName" : ticket.club.name,
        "clubLatitude" : ticket.club.location.coordinates[1],
        "clubLongitude" : ticket.club.location.coordinates[0],
        "startDate" : ticket.event.startDate.toISOString(),
        "endDate" : ticket.event.endDate.toISOString(),
        "ticketType" : ticket.ticketType,
        "noOfPeople" : ticket.noOfPeople,
        "totalCost" : ticket.totalCost,
        "encryptedQRTag" : ticket.qrTag,
        "isScanned" : ticket.isScanned
    }

    res.json({
        status: 1,
        result: TICKET
    });
}

exports.get_ticket_prices = function(req, res){
    var eventID = req.params.event_id;

    Event.findById(eventID)
        .select('ticket_types')
        .exec((err, event) => {
            if(err || !event) returnUnknownError(res)
            else returnTicketPrices(res, event.ticket_types)
        });
}

exports.get_user_tickets = function(req, res){
    var userID = req.params.user_id;

    Ticket.find({'userID' : userID})
        .populate({
            path: 'club',
            select: ['name', 'location']
        })
        .populate({
            path: 'event',
            select: ['title', '_id', 'imageUrl', 'startDate', 'endDate']
        })
        .exec((err, tickets) => {
            if(err) returnUnknownError(res)
            else returnTickets(res, tickets)
        })
}

exports.verify_ticket_purchase = function(req, mainRes){
    var userId = req.body.userId;
    var eventId = req.body.eventId;
    var clubId = req.body.clubId;
    var paymentReference = req.body.paymentReference;
    var ticketPrice = req.body.ticketPrice;
    var ticketType = req.body.ticketType;
    var ticketNumAvailable = req.body.ticketNumAvailable;
    var noOfPeople = req.body.noOfPeople;
    var eventImageUrl = req.body.eventImageUrl;

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/verify/'+paymentReference,
        method: 'GET',
        headers: {
          Authorization: 'Bearer sk_test_9f8e15c5b72c4356c8c0e04b8120284c6ad54b06'
        }
    }

    var mreq = https.request(options, res => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        });
      
        res.on('end', () => {
            console.log(JSON.parse(data));
            var result = JSON.parse(data)

            if(result.status == false){
                returnVerifyTicketResponse(mainRes, INVALID_PURCHASE_REFERENCE)
            }else{
                if(result.data.status == "failed"){
                    returnVerifyTicketResponse(mainRes, TRANSACTION_NOT_SUCCESSFUL)
                }else if(result.data.status == "success"){
                    var ticket = Ticket();

                    ticket.userID = userId;
                    ticket.event = Types.ObjectId(eventId);
                    ticket.club = Types.ObjectId(clubId);
                    ticket.ticketType = ticketType;
                    ticket.noOfPeople = noOfPeople;
                    ticket.imageUrl = eventImageUrl;
                    ticket.totalCost = ticketPrice * noOfPeople;
                    ticket.qrTag = otpGenerator.generate(30, {upperCase: true, digits: true, alphabets: true, specialChars: false});

                    ticket.save((err, doc) => {
                        if(err) returnUnknownError(err)
                        else {
                            doc
                            .populate({
                                path: 'club',
                                select: ['name', 'location']
                            })
                            .populate({
                                path: 'event',
                                select: ['title', '_id', 'imageUrl', 'startDate', 'endDate']
                            }).execPopulate().then(function() {
                                console.log(doc);
                                returnVerifyTicketResult(mainRes, doc);
                            }).catch(error => {
                                returnUnknownError(res)
                            });
                        }
                    })
                }
            }
        });
      
      }).on('error', error => {
        console.log(error);
        returnUnknownError(mainRes)
      })

      mreq.end();
}