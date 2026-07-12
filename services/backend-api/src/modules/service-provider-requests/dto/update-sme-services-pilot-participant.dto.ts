import { PartialType } from "@nestjs/swagger";
import { CreateSmeServicesPilotParticipantDto } from "./create-sme-services-pilot-participant.dto";

export class UpdateSmeServicesPilotParticipantDto extends PartialType(CreateSmeServicesPilotParticipantDto) {}
